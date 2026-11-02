// Jenkinsfile - CI/CD for RoomDecor (Spring Boot backend + Expo mobile app), branch master.
// Jenkins job "roomdecor-springboot-ci": New Item > Pipeline > Pipeline script from SCM (Git, this repo, branch */master,
// Script Path "Jenkinsfile"). Jenkins runs in container portal-jenkins (stack cicd-portal) and uses the PC's Docker Engine.
//
// Flow:  Checkout > Backend test + coverage > Mobile typecheck + lint > SonarQube backend/mobile (+ Quality Gate)
//        > Docker build image > Smoke test (temporary Postgres) > Deploy local (docker compose) > Deploy monitoring
//        (Prometheus + Grafana) > Verify deploy
//
// Needs in Jenkins (see docs/07-jenkins-sonar-giam-sat.md):
//   Tools: jdk21, maven3, node20, sonar-scanner. SonarQube server "SonarQube" + webhook to Jenkins.
//   Credential "roomdecor-backend-env" (Secret file) = a copy of backend/.env (DB_PASSWORD, JWT_SECRET...).
// Never deletes containers/volumes it did not create; secrets only come from Jenkins credentials.
pipeline {
    agent any
    tools {
        jdk 'jdk21'        // compiles for Java 17 (pom.xml java.version=17)
        maven 'maven3'
        nodejs 'node20'
    }
    parameters {
        booleanParam(name: 'DEPLOY', defaultValue: true,
            description: 'Deploy the new image locally with docker compose (container roomdecor-api) and start monitoring')
        string(name: 'UPLOADS_DIR',
            defaultValue: '/run/desktop/mnt/host/c/Users/TANBINHGAS/Desktop/room-decor-app-springboot/backend/uploads',
            description: 'Host folder for uploaded room photos, as Docker Desktop sees it (C:\\... = /run/desktop/mnt/host/c/...)')
    }
    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    environment {
        CI = 'true'
        EXPO_NO_TELEMETRY = '1'
        NPM_CONFIG_AUDIT = 'false'
        NPM_CONFIG_FUND = 'false'
        SCANNER_HOME = tool 'sonar-scanner'
        TAG = "ci-${BUILD_NUMBER}"
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --format="Commit: %h | %an | %s"'
            }
        }

        stage('Backend: test + coverage') {
            // Unit tests (Mockito) + MockMvc security tests, no database needed.
            // "verify" also writes target/site/jacoco/jacoco.xml for SonarQube.
            steps {
                dir('backend') {
                    sh 'java -version && mvn -v'
                    sh 'mvn -B verify'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml'
                    archiveArtifacts allowEmptyArchive: true, artifacts: 'backend/target/site/jacoco/jacoco.xml'
                }
            }
        }

        stage('Mobile: npm ci + typecheck + lint') {
            steps {
                dir('mobile-app') {
                    sh 'node -v && npm -v'
                    sh 'npm ci'
                    sh 'npm run typecheck'
                    sh 'npm run lint'
                }
            }
        }

        stage('SonarQube: backend') {
            steps {
                dir('backend') {
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            "$SCANNER_HOME/bin/sonar-scanner" \
                              -Dsonar.projectKey=roomdecor-springboot-backend \
                              "-Dsonar.projectName=RoomDecor Spring Boot - Backend" \
                              -Dsonar.sources=src/main/java \
                              -Dsonar.tests=src/test/java \
                              -Dsonar.java.binaries=target/classes \
                              -Dsonar.java.test.binaries=target/test-classes \
                              -Dsonar.java.libraries=$HOME/.m2/repository/**/*.jar \
                              -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml \
                              -Dsonar.sourceEncoding=UTF-8
                        '''
                    }
                }
                // Waits for SonarQube's webhook; a failed Quality Gate stops the pipeline here
                timeout(time: 10, unit: 'MINUTES') { waitForQualityGate abortPipeline: true }
                sh 'rm -rf backend/.scannerwork'
            }
        }

        stage('SonarQube: mobile') {
            steps {
                dir('mobile-app') {
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            "$SCANNER_HOME/bin/sonar-scanner" \
                              -Dsonar.projectKey=roomdecor-springboot-mobile \
                              "-Dsonar.projectName=RoomDecor Spring Boot - Mobile" \
                              -Dsonar.sources=app,src \
                              '-Dsonar.exclusions=**/node_modules/**,assets/**' \
                              -Dsonar.typescript.tsconfigPaths=tsconfig.json \
                              -Dsonar.sourceEncoding=UTF-8
                        '''
                    }
                }
                timeout(time: 10, unit: 'MINUTES') { waitForQualityGate abortPipeline: true }
                sh 'rm -rf mobile-app/.scannerwork'
            }
        }

        stage('Docker: build image backend') {
            steps {
                dir('backend') {
                    sh '''
                        docker version --format "Docker engine: {{.Server.Version}}"
                        docker compose version
                        docker build -t roomdecor-backend:$TAG .
                        # Image runs as a normal user, has no .env, only the jar
                        docker run --rm --entrypoint sh roomdecor-backend:$TAG -c 'test "$(id -un)" = app && test ! -e /app/.env && test -f /app/app.jar && echo "Image check: OK"'
                        docker image ls roomdecor-backend
                    '''
                }
            }
        }

        stage('Docker: smoke test (temporary Postgres)') {
            // Runs the new image with a throw-away Postgres on its own network:
            // Flyway V1..V8 must apply, health must be UP, metrics must be served.
            steps {
                sh '''
                    set -e
                    PW=$(head -c 18 /dev/urandom | base64 | tr -dc A-Za-z0-9)
                    JWT=$(head -c 48 /dev/urandom | base64 | tr -dc A-Za-z0-9)
                    docker network create rd-$TAG
                    docker run -d --name rd-db-$TAG --network rd-$TAG -e POSTGRES_DB=roomdecor -e POSTGRES_USER=roomdecor_app -e POSTGRES_PASSWORD=$PW postgres:16-alpine
                    for i in $(seq 1 30); do docker exec rd-db-$TAG pg_isready -U roomdecor_app -d roomdecor && break; sleep 2; done
                    docker run -d --name rd-api-$TAG --network rd-$TAG \
                      -e DB_URL=jdbc:postgresql://rd-db-$TAG:5432/roomdecor -e DB_PASSWORD=$PW -e JWT_SECRET=$JWT -e AI_PROVIDER=mock \
                      roomdecor-backend:$TAG
                    for i in $(seq 1 40); do
                      S=$(docker inspect -f '{{.State.Health.Status}}' rd-api-$TAG)
                      echo "health: $S"; [ "$S" = healthy ] && break; sleep 3
                    done
                    docker logs rd-api-$TAG 2>&1 | grep -E "Successfully applied|Started RoomDecor"
                    test "$(docker inspect -f '{{.State.Health.Status}}' rd-api-$TAG)" = healthy
                    docker exec rd-api-$TAG wget -qO- http://127.0.0.1:8080/actuator/prometheus | grep -m 3 -E "^(jvm_memory_used_bytes|hikaricp_connections_active)"
                    echo "Smoke test: OK"
                '''
            }
            post {
                always {
                    sh '''
                        docker logs --tail 50 rd-api-$TAG || true
                        docker rm -f rd-api-$TAG rd-db-$TAG || true
                        docker network rm rd-$TAG || true
                    '''
                }
            }
        }

        stage('Deploy local (docker compose)') {
            // Rebuilds and restarts ONLY container roomdecor-api (project roomdecor-existing-db).
            // Database room-decor-postgres and its data are not touched; Flyway only applies new migrations.
            when { expression { params.DEPLOY } }
            steps {
                dir('backend') {
                    withCredentials([file(credentialsId: 'roomdecor-backend-env', variable: 'BACKEND_ENV_FILE')]) {
                        sh '''
                            set -e
                            export UPLOADS_DIR="$UPLOADS_DIR"
                            docker compose -f docker-compose.existing-db.yml up -d --build backend
                            for i in $(seq 1 40); do
                              S=$(docker inspect -f '{{.State.Health.Status}}' roomdecor-api)
                              echo "roomdecor-api health: $S"; [ "$S" = healthy ] && break; sleep 3
                            done
                            test "$(docker inspect -f '{{.State.Health.Status}}' roomdecor-api)" = healthy
                            docker compose -f docker-compose.existing-db.yml ps
                        '''
                    }
                }
            }
        }

        stage('Deploy monitoring (Prometheus + Grafana)') {
            when { expression { params.DEPLOY } }
            steps {
                dir('backend/monitoring') {
                    sh '''
                        set -e
                        docker compose up -d --build
                        docker compose ps
                    '''
                }
            }
        }

        stage('Verify deploy') {
            when { expression { params.DEPLOY } }
            steps {
                sh '''
                    set -e
                    echo "--- Backend health (inside container) ---"
                    docker exec roomdecor-api wget -qO- http://127.0.0.1:8080/actuator/health; echo
                    echo "--- Prometheus target roomdecor-backend must be up ---"
                    for i in $(seq 1 20); do
                      R=$(docker exec roomdecor-prometheus wget -qO- 'http://127.0.0.1:9090/api/v1/query?query=up{job="roomdecor-backend"}' || true)
                      echo "$R"
                      echo "$R" | grep -q '"value":\\[[0-9.]*,"1"\\]' && break; sleep 5
                    done
                    echo "$R" | grep -q '"value":\\[[0-9.]*,"1"\\]'
                    echo "--- Grafana health ---"
                    docker exec roomdecor-grafana wget -qO- http://127.0.0.1:3000/api/health; echo
                    echo "Deploy OK: API http://localhost:8080  Prometheus http://localhost:9090  Grafana http://localhost:3030"
                '''
            }
        }
    }
    post {
        // Only removes the image tag of this build (the deployed image is roomdecor-backend:local)
        always { sh 'docker rmi roomdecor-backend:$TAG || true' }
    }
}
