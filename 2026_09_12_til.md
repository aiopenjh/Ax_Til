# 2026-09-12 학습 내용

## 1. 오늘 배운 내용과 목표

- 오늘 배운 주제: Git 기초 개념 및 GitHub 연동 (SSH 설정)
- 오늘의 목표: Git의 add/commit/push 흐름을 이해하고 GitHub에 올려보기

## 2. 개념과 용어 정리
### git 시작

| 용어 | 뜻 | 기억할 점 |
|---|---|---|
| git status | 현재 저장소의 상태를 보여준다. | 각 영역에 어떤 변경이 있는지 현재 상태를 보여준다.|
| git add | 변경사항을 스테이지에 추가한다. | 변경 파일을 다음 커밋 대상으로 올린다.|
| git commit | 변경사항을 저장소에 저장한다. | 스테이징된 변경사항을 커밋한다. |

-- 스냅샷 기반 커밋 원리
 - Git은 파일의 차이(diff)가 아닌 스냅샷(snapshot)을 저장한다.
 - 커밋 시점의 모든 파일 상태를 하나의 사진처럼 찍어두는 방식
 - 변경이 없는 파일은 이전 스냅샷을 재사용하므로 낭비가 없다.

-- HEAD,브랜치포인터,SHA 해시
 - HEAD: 현재 작업중인 커밋 또는 브랜치를 가리키는 포인터
 - 브랜치 포인터: 특정 커밋을 가리키는 이름표, 새커밋이 생기면 자동으로 앞으로 온다.
 - SHA 해시: 각 커밋에 부여되는 40자리 고유 ID, 내용을 기반으로 생생되므로 조금만바뀌어도 해시가 완전히 달라지며 이력변조를 사실상 탐지할 수 있다.


### git ssh 생성 과 git hub 등록
```bash
# 1. SSH 키 생성 (최신 표준 ed25519 알고리즘)
ssh-keygen -t ed25519 -C "본인이메일@gmail.com"

# 2. Windows 터미널에서 공개키 내용 출력 후 복사
type %USERPROFILE%\.ssh\id_ed25519.pub

# 3. GitHub 웹사이트(Settings > SSH Keys)에 등록 후 연결 테스트
ssh -T git@github.com
```

### git init 과 git clone 의 차이
```bash
# 1. git init: 새 프로젝트를 시작할때, 현재폴더에 git 생성
# 2. git clone: 다른컴퓨터에서 이미 저장되있는 저장소를 가지고 올때
```
- .gitignore 파일 패턴 규칙

| 패턴 | 의미 | 
|---|---|
| *.log | 모든 .log 파일 |
| build/ | build 디렉터리 전체 |
| !important.log | 앞선 *.log 등으로 제외됐더라도 이 파일은 다시 추적(부정 패턴) |
| **/*.pyc | 모든 하위 폴더의 .pyc 파일 |

* (와일드카드 - 모든 것): *.log, *.env 처럼 "확장자가 이거인 건 전부 다 제외해!" 할 때 씁니다.

* / (슬래시 - 폴더): .venv/, build/ 처럼 "이 폴더 안의 내용물은 통째로 다 제외해!" 할 때 씁니다.


### github에 gitignore 를 나중에 추가해서 미리 올린경우
```bash
git rm --cached .env
# rm : ".env을(를) " --cached: 내 컴퓨터 파일은 건드리지말고 .env: 캐시에서 삭제
git rm --cached -r __pycache__/ # 내 컴퓨터는 그대로 두고, Git 감시 장부에서만 폴더 통째로 제외

git commit -m "chore: remove tracked files that should be ignored"
```
### 중요도 100!!!!
"이미 GitHub에 한 번이라도 Push된 API Key는, 지우려고 애쓰지 말고 무조건 즉시 폐기하고 새로 발급받아라."

### git commit할 때 Conventional Commits 가이드라인
| 타입 | 의미 |
|---|---|
| feat | 새로운 기능 추가 |
| fix | 버그 수정 |
| docs | 문서(README, TIL 등) 수정 |
| refactor | 코드 리팩터링 (기능 변경 없이 구조 개선) |
| chore | 빌드/설정 파일 변경 (.gitignore, 패키지 설치 등) |
| test | 테스트 코드 추가/수정 |

- 협업시에 어떻게 멘트를 적어 놓는냐에따라 협업자가 보기 편하다.
- git add -p (부분 스테이징) - 참고용
- 한 커밋 한 의도 (여러 작업 섞지 말고 쪼개서 커밋하기)

### git log --oneline : 지저분한 로그를 한 줄씩 깔끔하게 요약해서 보는 실무 1등 옵션

### 변경 되돌리기 (restore / reset / revert)

| 명령어 | 역할 | 언제 쓰나요? (핵심) |
|---|---|---|
| git restore <파일> | 방금 수정한 코드 취소 | 커밋 전, 코드 수정을 마지막 커밋 상태로 원복할 때 |
| git restore --staged <파일> | add 취소 | 커밋 전, 스테이징 영역에서 파일만 내릴 때 |
| git reset --hard HEAD~1 | 과거 커밋 완전 삭제 | 로컬 전용! 아직 GitHub에 안 올린 커밋 되돌릴 때 |
| git revert <커밋ID> | 커밋 취소 이력 생성 | 실무 필수! 이미 GitHub에 푸시한 커밋을 안전하게 취소할 때 |

> 협업 매너 1등 규칙: 이미 GitHub에 push한 커밋은 절대 reset하지 말고, 항상 revert를 사용한다!


## 3. 예제 및 실습
```bash
mkdir TIL
cd TIL
git init
git status      # 상태 확인
git add .       # 장바구니(Staging Area)에 담기
git commit -m "docs: 첫 TIL 작성"   # 도장 쾅 찍기
git branch -M main                                  # 기본 브랜치 이름을 main으로
git remote add origin git@github.com:계정명/저장소명.git  # 깃허브 주소 연결
git push -u origin main

git add .
git commit -m "오늘의 공부 내용"
git push
```

## 4. 실수 및 트러블슈팅

git init을 TIL 폴더가아닌 상위폴더에서 해가지고 다시 지움
git add. 을 git add . 으로 한칸뛰어서 담아야 담김
git ssh아이디를 만들지않고 ssh 를 연결시도함
 - ssh-keygen -t ed25519 -C "본인이메일@gmail.com"
 - type %USERPROFILE%\.ssh\id_ed25519.pub
 - ssh -T git@github.com
 으로 키 생성 -> 공개키 복사 -> GitHub에 등록 -> 연결 확인 과정을 진행해야함.
ssh -T aiopenjh@gmail.com 으로 연결 확인을 했더니 실패
 - ssh -T git@github.com 으로 연결 하고 push를 해야 연결

## 5. 오늘의 핵심
- 반드시 기억할 내용 1: git은 원격 저장공간이므로 .env  같은 파일은 조심해야된다 
- 반드시 기억할 내용 2: 협업은 revert를 활용하여 진행하도록 한다. 
- 헷갈리기 쉬운 내용: git 은 연결된곳은 파일로 위치를 확인한다. 삭제할때는 reset을 쓰지않는다.
- 한 문장 요약: git 을 처음 접할때는 어색하고, 굳이 써야되나 싶지만 사용하다보면 약간 반 필수 적인 요건이 든다.

## 6. 느낀 점 및 추가정리
- 잘 이해한 부분: git init git add . git commit -m "메시지" git push 앞으로 쓸것은 3단계로 잘 올라가는지 확인한다.
- 아직 어려운 부분: 자주쓰던게 아니라 계속 써보면서 익혀야 될 거같다.
- 다음에 복습할 내용: 지속적으로 3단계를 쓰면서 commit을 남기고 올라가는걸 확인 해야된다.
- 오늘의 느낀 점: 개발자의 꿈을 꾸는 첫발은아니지만 진짜 제대로 시작 해보려고한다.