FROM openjdk:11

ENV USE_PROFILE dev
ARG JAR_FILE=cmp-asset.jar
ARG JAR_CREATED_PATH=build/libs
ARG JAR_TARGET_PATH=/app

RUN mkdir -p /app
WORKDIR /app
ADD . /app

# JAR 파일 메인 디렉토리에 복사
COPY ${JAR_CREATED_PATH}/${JAR_FILE} /app/cmp-asset.jar
ENTRYPOINT ["java", "-Dspring.profiles.active=${USE_PROFILE}", "-jar", "cmp-asset.jar"]