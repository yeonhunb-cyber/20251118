import './style.css'

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeiDuTFucV8jkuRimRSPj6DQQXvnQ0k2TpTMHYAH0Ff7uhAew/formResponse';
const ENTRY_IDS = {
  name: 'entry.826126162',
  studentId: 'entry.327932375',
  message: 'entry.1666035037',
  chatConversation: 'entry.49990301',
  reflectionAndFeedback: 'entry.1648736314'
};

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

// 환경 변수 디버깅 (개발 모드에서만)
if (import.meta.env.DEV) {
  console.log('환경 변수 확인:', {
    hasKey: !!OPENAI_API_KEY,
    keyLength: OPENAI_API_KEY?.length || 0,
    keyPrefix: OPENAI_API_KEY?.substring(0, 7) || '없음'
  });
}

document.querySelector('#app').innerHTML = `
  <div class="main-container">
    <h1 class="main-title">설문 폼 제출 시스템</h1>
    
    <div class="sections-container">
      <!-- 기본 설문 폼 -->
      <div class="section">
        <h2>기본 설문</h2>
        <form id="surveyForm">
          <div class="form-group">
            <label for="name">이름</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              placeholder="이름을 입력하세요"
            />
          </div>
          
          <div class="form-group">
            <label for="studentId">학번</label>
            <input 
              type="text" 
              id="studentId" 
              name="studentId" 
              required 
              placeholder="학번을 입력하세요"
            />
          </div>
          
          <div class="form-group">
            <label for="message">하고 싶은 말</label>
            <textarea 
              id="message" 
              name="message" 
              rows="5" 
              required 
              placeholder="하고 싶은 말을 입력하세요"
            ></textarea>
          </div>
          
          <button type="submit" id="submitBtn">제출</button>
          <div id="messageArea" class="message-area"></div>
        </form>
      </div>

      <!-- 챗봇 대화 -->
      <div class="section">
        <h2>오늘 목표 공부 시간</h2>
        <div id="chatContainer" class="chat-container">
          <div id="chatMessages" class="chat-messages">
            <div class="chat-message bot-message">
              안녕하세요! 오늘 목표 공부 시간에 대해 대화해볼까요? 목표 시간을 알려주세요.
            </div>
          </div>
          <div class="chat-input-container">
            <input 
              type="text" 
              id="chatInput" 
              class="chat-input" 
              placeholder="메시지를 입력하세요..."
            />
            <button type="button" id="sendChatBtn" class="send-btn">전송</button>
          </div>
          <button type="button" id="submitChatBtn" class="submit-chat-btn">제출하기</button>
          <div id="chatMessageArea" class="message-area"></div>
        </div>
      </div>

      <!-- 자기 성찰 -->
      <div class="section">
        <h2>어제 공부 시간 성찰</h2>
        <form id="reflectionForm">
          <div class="form-group">
            <label for="reflection">어제 공부 시간에 대한 자기 성찰</label>
            <textarea 
              id="reflection" 
              name="reflection" 
              rows="8" 
              required 
              placeholder="어제 공부 시간에 대해 어떻게 생각하시나요? 잘한 점과 개선할 점을 적어주세요."
            ></textarea>
          </div>
          
          <div id="feedbackContainer" class="feedback-container" style="display: none;">
            <label>GPT 피드백</label>
            <div id="feedbackContent" class="feedback-content"></div>
          </div>
          
          <button type="button" id="generateFeedbackBtn">피드백 생성하기</button>
          <button type="button" id="submitReflectionBtn" style="display: none;">Google Form에 제출하기</button>
          <div id="reflectionMessageArea" class="message-area"></div>
        </form>
      </div>
    </div>
  </div>
`

// 기본 설문 폼 처리
const form = document.querySelector('#surveyForm');
const submitBtn = document.querySelector('#submitBtn');
const messageArea = document.querySelector('#messageArea');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.querySelector('#name').value.trim();
  const studentId = document.querySelector('#studentId').value.trim();
  const message = document.querySelector('#message').value.trim();
  
  if (!name || !studentId || !message) {
    showMessage(messageArea, '모든 필드를 입력해주세요.', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append(ENTRY_IDS.name, name);
  formData.append(ENTRY_IDS.studentId, studentId);
  formData.append(ENTRY_IDS.message, message);
  
  await submitToGoogleForm(formData, submitBtn, messageArea, form);
});

// 챗봇 기능
let chatConversation = [];

const chatInput = document.querySelector('#chatInput');
const sendChatBtn = document.querySelector('#sendChatBtn');
const chatMessages = document.querySelector('#chatMessages');
const submitChatBtn = document.querySelector('#submitChatBtn');
const chatMessageArea = document.querySelector('#chatMessageArea');

function addChatMessage(text, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;
  messageDiv.textContent = text;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  chatConversation.push({
    role: isUser ? 'user' : 'bot',
    text: text,
    timestamp: new Date().toISOString()
  });
}

sendChatBtn.addEventListener('click', () => {
  const message = chatInput.value.trim();
  if (message) {
    addChatMessage(message, true);
    chatInput.value = '';
    
    // 간단한 봇 응답
    setTimeout(() => {
      const responses = [
        '좋은 목표네요! 구체적인 계획을 세워보면 어떨까요?',
        '꾸준히 실천하는 것이 중요합니다. 응원합니다!',
        '더 자세히 알려주세요. 어떤 과목을 공부하실 건가요?',
        '시간 관리가 중요하네요. 어떤 방법을 사용하시나요?'
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addChatMessage(randomResponse, false);
    }, 500);
  }
});

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendChatBtn.click();
  }
});

submitChatBtn.addEventListener('click', async () => {
  if (chatConversation.length === 0) {
    showMessage(chatMessageArea, '대화 내용이 없습니다.', 'error');
    return;
  }
  
  const conversationText = chatConversation
    .map(msg => `${msg.role === 'user' ? '사용자' : '봇'}: ${msg.text}`)
    .join('\n');
  
  const formData = new FormData();
  formData.append(ENTRY_IDS.chatConversation, conversationText);
  
  submitChatBtn.disabled = true;
  submitChatBtn.textContent = '제출 중...';
  
  try {
    await fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    });
    
    showMessage(chatMessageArea, '제출이 완료되었습니다.', 'success');
    chatConversation = [];
    chatMessages.innerHTML = '<div class="chat-message bot-message">안녕하세요! 오늘 목표 공부 시간에 대해 대화해볼까요? 목표 시간을 알려주세요.</div>';
  } catch (error) {
    showMessage(chatMessageArea, '제출 중 오류가 발생했습니다.', 'error');
    console.error('Submission error:', error);
  } finally {
    submitChatBtn.disabled = false;
    submitChatBtn.textContent = '제출하기';
  }
});

// 자기 성찰 기능
const reflectionForm = document.querySelector('#reflectionForm');
const generateFeedbackBtn = document.querySelector('#generateFeedbackBtn');
const submitReflectionBtn = document.querySelector('#submitReflectionBtn');
const reflectionMessageArea = document.querySelector('#reflectionMessageArea');
const feedbackContainer = document.querySelector('#feedbackContainer');
const feedbackContent = document.querySelector('#feedbackContent');

let currentReflection = '';
let currentFeedback = '';

// 피드백 생성 버튼 클릭
generateFeedbackBtn.addEventListener('click', async () => {
  const reflection = document.querySelector('#reflection').value.trim();
  
  if (!reflection) {
    showMessage(reflectionMessageArea, '자기 성찰을 입력해주세요.', 'error');
    return;
  }
  
  // API 키 검증 (빈 문자열, undefined, null, 기본값 체크)
  const apiKey = OPENAI_API_KEY?.trim();
  
  // 상세한 디버깅 정보
  console.log('API 키 확인:', {
    raw: OPENAI_API_KEY,
    trimmed: apiKey,
    length: apiKey?.length || 0,
    isEmpty: !apiKey || apiKey === '',
    isDefault: apiKey === 'your_openai_api_key_here',
    envMode: import.meta.env.MODE,
    allEnvKeys: Object.keys(import.meta.env).filter(k => k.includes('OPENAI'))
  });
  
  if (!apiKey || apiKey === '' || apiKey === 'your_openai_api_key_here') {
    const errorMsg = 'OpenAI API 키를 설정해주세요.\n' + 
                    '1. .env 파일에 VITE_OPENAI_API_KEY=sk-... 형식으로 추가\n' +
                    '2. 개발 서버를 재시작하세요 (Ctrl+C 후 npm run dev)';
    showMessage(reflectionMessageArea, errorMsg, 'error');
    console.error('API 키 오류:', {
      keyExists: !!OPENAI_API_KEY,
      keyValue: OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 10)}...` : '없음',
      keyLength: OPENAI_API_KEY?.length || 0,
      envMode: import.meta.env.MODE,
      allEnvKeys: Object.keys(import.meta.env)
    });
    return;
  }
  
  generateFeedbackBtn.disabled = true;
  generateFeedbackBtn.textContent = '피드백 생성 중...';
  feedbackContainer.style.display = 'none';
  submitReflectionBtn.style.display = 'none';
  reflectionMessageArea.textContent = '';
  
  try {
    // GPT 피드백 생성
    const feedback = await generateGPTFeedback(reflection);
    
    // 현재 값 저장
    currentReflection = reflection;
    currentFeedback = feedback;
    
    // 피드백 표시
    feedbackContent.textContent = feedback;
    feedbackContainer.style.display = 'block';
    
    // 제출 버튼 표시
    submitReflectionBtn.style.display = 'block';
    
    showMessage(reflectionMessageArea, '피드백이 생성되었습니다. 제출하기 버튼을 눌러주세요.', 'success');
    
  } catch (error) {
    showMessage(reflectionMessageArea, `오류가 발생했습니다: ${error.message}`, 'error');
    console.error('Error:', error);
  } finally {
    generateFeedbackBtn.disabled = false;
    generateFeedbackBtn.textContent = '피드백 생성하기';
  }
});

// Google Form 제출 버튼 클릭
submitReflectionBtn.addEventListener('click', async () => {
  if (!currentReflection || !currentFeedback) {
    showMessage(reflectionMessageArea, '피드백을 먼저 생성해주세요.', 'error');
    return;
  }
  
  submitReflectionBtn.disabled = true;
  submitReflectionBtn.textContent = '제출 중...';
  
  try {
    // Google Form에 제출 (자기 성찰 + 피드백)
    const combinedText = `[자기 성찰]\n${currentReflection}\n\n[GPT 피드백]\n${currentFeedback}`;
    
    const formData = new FormData();
    formData.append(ENTRY_IDS.reflectionAndFeedback, combinedText);
    
    await fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    });
    
    showMessage(reflectionMessageArea, '제출이 완료되었습니다.', 'success');
    
    // 폼 초기화
    reflectionForm.reset();
    feedbackContainer.style.display = 'none';
    submitReflectionBtn.style.display = 'none';
    currentReflection = '';
    currentFeedback = '';
    
    // 2초 후 메시지 제거
    setTimeout(() => {
      reflectionMessageArea.textContent = '';
    }, 2000);
    
  } catch (error) {
    showMessage(reflectionMessageArea, `제출 중 오류가 발생했습니다: ${error.message}`, 'error');
    console.error('Submission error:', error);
  } finally {
    submitReflectionBtn.disabled = false;
    submitReflectionBtn.textContent = 'Google Form에 제출하기';
  }
});

async function generateGPTFeedback(reflection) {
  const apiKey = OPENAI_API_KEY?.trim();
  
  if (!apiKey || apiKey === '' || apiKey === 'your_openai_api_key_here') {
    throw new Error('OpenAI API 키가 설정되지 않았습니다.');
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 학습 코치입니다. 학생의 공부 시간에 대한 자기 성찰을 읽고, 격려와 구체적인 개선 방안을 제시하는 피드백을 제공하세요. 한국어로 답변해주세요.'
          },
          {
            role: 'user',
            content: `다음은 학생의 자기 성찰입니다:\n\n${reflection}\n\n위 내용에 대한 피드백을 작성해주세요.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '피드백을 생성할 수 없습니다.';
  } catch (error) {
    throw error;
  }
}

async function submitToGoogleForm(formData, button, messageArea, formElement = null) {
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = '제출 중...';
  
  try {
    await fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    });
    
    showMessage(messageArea, '제출이 완료되었습니다.', 'success');
    if (formElement) {
      formElement.reset();
    }
    
    setTimeout(() => {
      messageArea.textContent = '';
    }, 2000);
    
  } catch (error) {
    showMessage(messageArea, '제출 중 오류가 발생했습니다.', 'error');
    console.error('Submission error:', error);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message-area ${type === 'success' ? 'success' : 'error'}`;
}
