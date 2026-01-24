# Vercel 배포 가이드

## 🚨 발견된 문제

Vercel에 배포 시 그래프가 표시되지 않는 문제는 **JSON 파일 로딩 실패** 때문입니다.

### 원인
1. CORS 정책으로 인한 fetch 실패
2. 상대 경로 문제
3. 파일 로딩 순서 문제

### 해결 방법

이제 세 가지 데이터 로딩 방식을 지원합니다:

1. **임베드된 데이터** (data.js) - 가장 안정적 ✅
2. 외부 JSON 파일 (graph-data.json)
3. 기본 샘플 데이터 (폴백)

---

## 📦 파일 구조

### 필수 파일 (Vercel 배포용)

```
your-repo/
├── index.html       # 메인 HTML
├── styles.css       # 스타일시트
├── data.js          # ⭐ 임베드된 데이터 (필수!)
├── app.js           # 애플리케이션 로직
├── graph-data.json  # (선택) 외부 JSON 파일
└── README.md        # 문서
```

**중요:** `data.js` 파일을 꼭 포함해야 합니다!

---

## 🚀 Vercel 배포 단계

### 1. GitHub 저장소 준비

```bash
# 1. GitHub에서 새 저장소 생성 (예: gaetmaeul-graph)

# 2. 로컬에서 초기화
git init
git add .
git commit -m "Initial commit: 갯마을 네트워크 그래프"

# 3. GitHub에 푸시
git remote add origin https://github.com/your-username/gaetmaeul-graph.git
git branch -M main
git push -u origin main
```

### 2. Vercel 배포

#### 방법 A: Vercel 웹사이트 사용

1. https://vercel.com 접속
2. "New Project" 클릭
3. GitHub 저장소 선택
4. "Deploy" 클릭
5. 완료! 🎉

#### 방법 B: Vercel CLI 사용

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 배포
vercel

# 3. 프로덕션 배포
vercel --prod
```

---

## ✅ 배포 후 확인 사항

### 1. 파일이 모두 업로드되었는지 확인

GitHub 저장소에서 다음 파일들이 보이는지 확인:
- ✅ index.html
- ✅ styles.css
- ✅ data.js ⭐
- ✅ app.js
- ✅ graph-data.json

### 2. 브라우저 개발자 도구로 확인

배포된 사이트에서 F12를 눌러 콘솔 확인:

```javascript
// 정상 작동 시:
✅ "임베드된 데이터 로드 완료: {nodes: Array(13), edges: Array(12)}"

// 또는:
✅ "외부 JSON 데이터 로드 완료: {nodes: Array(13), edges: Array(12)}"

// 에러 발생 시:
❌ "데이터 로드 실패: ..."
✅ "기본 샘플 데이터를 사용합니다."
```

### 3. 네트워크 탭 확인

개발자 도구 → Network 탭:
- `data.js` 200 OK ✅
- `app.js` 200 OK ✅
- `styles.css` 200 OK ✅

---

## 🐛 문제 해결

### 문제 1: 빈 화면만 표시됨

**원인:** data.js 파일이 없음

**해결:**
```bash
# data.js 파일을 저장소에 추가
git add data.js
git commit -m "Add data.js for embedded data"
git push
```

### 문제 2: "데이터 로드 실패" 에러

**확인 사항:**
1. index.html에서 스크립트 순서 확인
   ```html
   <script src="data.js"></script>  <!-- 먼저! -->
   <script src="app.js"></script>   <!-- 나중! -->
   ```

2. data.js 파일 형식 확인
   ```javascript
   window.GRAPH_DATA = { ... };  // 정확한 형식
   ```

### 문제 3: 그래프가 너무 작게 보임

**원인:** 캔버스 크기 문제

**해결:** styles.css 확인
```css
.graph-container {
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  min-height: 600px; /* 추가 */
}
```

---

## 📝 vercel.json 설정 (선택)

프로젝트 루트에 `vercel.json` 파일 생성:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

---

## 🔄 데이터 업데이트 방법

### 방법 1: data.js 직접 수정 (권장)

```javascript
// data.js 파일 수정
window.GRAPH_DATA = {
  "nodes": [
    // 노드 추가/수정
    {
      "id": "receipt-003",
      "type": "receipt",
      "label": "RCP-20150722-003",
      "data": { ... }
    }
  ],
  "edges": [ ... ]
};
```

```bash
# Git에 커밋 & 푸시
git add data.js
git commit -m "Update graph data"
git push
```

Vercel이 자동으로 재배포합니다!

### 방법 2: 웹 인터페이스 사용

1. 배포된 사이트에서 데이터 수정
2. "📥 데이터 내보내기" 클릭
3. 다운로드된 `graph-data.json` 파일을 `data.js` 형식으로 변환:

```javascript
// 수동 변환
window.GRAPH_DATA = {
  // graph-data.json 내용 복사 붙여넣기
};
```

4. Git에 커밋 & 푸시

---

## 🎨 커스터마이징

### 색상 변경

`styles.css` 파일:
```css
.color-receipt { background-color: #667eea; } /* 보라색 */
.color-weather { background-color: #10b981; } /* 초록색 */
/* ... */
```

### 노드 크기 변경

`app.js` 파일:
```javascript
this.config = {
  nodeRadius: 30,  // 25 → 30으로 증가
  fontSize: 14,    // 12 → 14로 증가
  // ...
};
```

---

## 📊 성능 최적화

### 대용량 데이터 처리

노드가 100개 이상일 때:

```javascript
// app.js의 물리 시뮬레이션 조정
this.simulation = {
  centerForce: 0.005,  // 0.01 → 0.005
  repelForce: 3000,    // 5000 → 3000
  attractForce: 0.02,  // 0.01 → 0.02
  damping: 0.85        // 0.8 → 0.85
};
```

---

## 🔗 유용한 링크

- **Vercel 문서**: https://vercel.com/docs
- **GitHub 가이드**: https://docs.github.com/en/get-started
- **MDN Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

## ✅ 체크리스트

배포 전 확인:

- [ ] 모든 파일이 Git에 추가됨
- [ ] data.js 파일 포함 확인
- [ ] index.html에서 스크립트 순서 확인
- [ ] 로컬에서 정상 작동 확인
- [ ] GitHub에 푸시 완료
- [ ] Vercel 배포 완료
- [ ] 브라우저에서 실제 작동 확인

---

## 💡 팁

### 빠른 테스트
로컬에서 테스트하려면:
```bash
# Python 3 사용
python -m http.server 8000

# 또는 Node.js 사용
npx http-server
```

그 다음 브라우저에서 `http://localhost:8000` 접속

### Git 커밋 메시지 예시
```bash
git commit -m "feat: Add new receipt node"
git commit -m "fix: Update menu prices"
git commit -m "style: Change node colors"
git commit -m "docs: Update README"
```

---

## 🎉 성공!

모든 단계를 완료했다면, 이제 다음 URL에서 그래프를 볼 수 있습니다:
```
https://your-project.vercel.app
```

문제가 계속되면:
1. 브라우저 캐시 삭제 (Ctrl + Shift + R)
2. Vercel 대시보드에서 재배포
3. data.js 파일 확인

---

**Happy Coding! 🚀**
