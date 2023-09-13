# 2023.09.12 추가
# Node.js 이미지 사용 (예: LTS 버전)
FROM node:lts

# 필요한 환경 변수 정의 (선택 사항, 필요에 따라 수정)
ENV NODE_ENV=development

# 앱 디렉토리 생성 및 설정
RUN mkdir -p /app
WORKDIR /app

# 애플리케이션 파일들을 Docker 이미지 내로 복사
COPY . /app

# 애플리케이션 의존성 설치
RUN npm install

# 애플리케이션 실행
CMD ["npm", "start"]