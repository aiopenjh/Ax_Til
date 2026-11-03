# 2026-11-02 학습 내용

## 1. 오늘 배운 내용과 목표

- 오늘 배운 주제: 4장 2강 개념 문제 풀이, 환경 변수(.env)와 로거 분리, PostgreSQL과 SQLAlchemy 2.0 비동기 연결(asyncpg·커넥션 풀·세션), ORM 모델과 관계(1:N, N:1), 수정 감지와 연쇄 삭제, `joinedload`와 `selectinload`, 비동기 지연 로딩 오류(MissingGreenlet), 동시성 문제와 비관적 락 (노션 5장 1강~5장 2강)
- 오늘의 목표: 메모리 대신 DB에 데이터를 남기는 흐름(엔진 → 세션 → 모델 → 커밋)을 이해하고, 연관된 데이터를 몇 번의 쿼리로 가져오는지 구분할 수 있도록 정리하기.
- 수업을 듣기 전 알고 있던 내용: 직접 작성

---

## 2. 개념과 용어 정리

### 1) 전날 복습 — 4장 2강 문제와 '기다리는 동안 다른 일 하기'

| 문제 주제                         | 정리                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `bytes = File()` vs `UploadFile`  | `bytes`는 전체를 메모리에, `UploadFile`은 약 1MB를 넘으면 임시 파일로                   |
| 오래 걸리는 일을 응답 뒤로        | `BackgroundTasks`                                                                      |
| 스트리밍·백그라운드에 대한 틀린 설명 | 스트리밍은 첫 조각부터 바로 보내므로 '다 받아야 재생 시작'은 틀림                      |
| 분할 전송 단위                    | 청크(Chunk)                                                                            |
| asyncpg 비동기 DB 연결            | DB 응답을 기다리는 동안 이벤트 루프가 다른 요청을 처리(논블로킹). 쿼리 자체가 빨라지는 것은 아님 |

동기(블로킹): 쿼리를 보내고 결과가 올 때까지 그 자리에서 멈춤 → 끝나야 다음 처리.
비동기(논블로킹): `await`에서 기다리는 동안 다른 요청을 처리하고, 결과가 오면 이어서 진행.

### 2) 환경 변수와 .env — 접속 정보를 코드 밖으로

DB 주소·비밀번호를 코드에 직접 쓰면 저장소에 올라가거나 환경(내 PC·서버)마다 코드를 고쳐야 한다. `.env.local` 같은 파일에 적고 `python-dotenv`의 `load_dotenv()`로 읽은 뒤 `os.getenv("이름", 기본값)`으로 꺼낸다.

```txt
# .env.local
LOGGING_MODE=debug
LOGGER_NAME=app
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
POOL_SIZE=10
MAX_POOL_SIZE=15
```

| 확인할 점            | 내용                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| URL 형식             | `드라이버://아이디:비밀번호@주소:포트/DB이름`. `postgresql+asyncpg` 다음 `://`의 콜론을 빠뜨리지 않기        |
| 값은 항상 문자열     | `int(os.getenv("POOL_SIZE", "10"))`처럼 숫자로 바꿔 써야 함                                                   |
| 변수 이름 일치       | 코드가 읽는 이름과 `.env`의 이름이 같아야 함. 예: chapter05-2는 `POOL_SIZE`, 프로젝트는 `CONNECTION_POOL_SIZE` |
| 파일 이름            | `load_dotenv()`는 기본으로 `.env`를 찾음. `.env.local`을 쓰려면 경로를 지정하거나 이름을 맞춰야 함           |
| 비밀값               | `.env` 파일은 `.gitignore`에 넣고 저장소에 올리지 않기                                                       |

로거도 `shared/logger.py`처럼 한 곳에서 `basicConfig`를 하고, `LOGGING_MODE=debug`이면 `DEBUG`, 아니면 `INFO`로 레벨을 바꾼다. 4장의 '설정은 한 번, 로거는 이름으로' 규칙을 환경 변수와 합친 형태다.

### 3) ORM과 SQLAlchemy 2.0

파이썬은 데이터를 객체로, DB는 표의 행으로 다룬다. ORM은 이 둘을 이어 주는 통역사로, SQL을 직접 쓰지 않고 클래스·속성·메서드로 DB를 다룬다. SQLAlchemy 2.0은 `Mapped[타입]` + `mapped_column()` 방식이라 타입 힌트가 그대로 컬럼 정의가 되고, 편집기가 오타·타입을 미리 잡아 준다.

ORM을 써도 결국 SQL이 실행된다. `echo=True`(프로젝트는 `SQL_ECHO=true`)로 켜면 실제로 나가는 SQL을 터미널에서 볼 수 있다. 쿼리 개수를 확인할 때 꼭 켜 본다.

### 4) 엔진·커넥션 풀·세션 — 비동기 연결 구조

| 요소                          | 역할                                           | 수업 코드 설정 / 기억할 점                                                                 |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `create_async_engine(URL)`    | DB 연결(커넥션 풀)을 관리하는 객체             | 앱 전체에서 하나만 만들어 공유                                                             |
| `pool_size`                   | 평소 열어 두고 돌려쓰는 연결 수                | 10                                                                                         |
| `max_overflow`                | 바쁠 때 잠깐 더 여는 연결 수                   | 20 → 최대 30개. 다 쓰고 있으면 기다림                                                      |
| `pool_timeout`                | 빈 연결을 기다리는 최대 시간                   | 30초 넘으면 오류. 세션을 안 닫으면(누수) 여기서 막힘                                       |
| `pool_recycle`                | 오래된 연결을 새로 바꾸는 주기                 | 1800초                                                                                     |
| `pool_pre_ping`               | 꺼내기 전에 연결이 살아 있는지 확인            | 끊긴 연결로 쿼리하다 실패하는 것 방지                                                      |
| `async_sessionmaker`          | 세션을 같은 규칙으로 만들어 주는 공장          | `autoflush=False`, `expire_on_commit=False`                                                |
| `AsyncSession`                | DB와 한 번 대화하는 창구(작업 단위)            | 요청마다 새로 만들고, 끝나면 연결을 풀에 반납                                              |

커넥션 풀은 요청마다 DB 연결을 새로 열고 닫는 비용을 줄이려고, 연결을 미리 열어 두고 돌려쓰는 대기실이다.

`expire_on_commit=False`가 중요한 이유: 기본값(`True`)이면 커밋 후 객체 속성이 '만료'되어, 다음에 속성을 읽을 때 DB에서 다시 가져오려 한다. 비동기 세션에서는 이렇게 `await` 없이 몰래 DB에 가는 동작이 허용되지 않아 오류(`MissingGreenlet`)가 날 수 있다. 그래서 비동기에서는 `False`로 두고, 최신 값이 필요하면 `await session.refresh(obj)`로 명시적으로 다시 읽는다.

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:  # 블록이 끝나면 세션 닫기 → 연결 반납
        try:
            yield session                        # 경로 함수에 세션을 빌려줌
        except Exception:
            await session.rollback()             # 오류면 이번 작업을 모두 취소
            raise
```

`Depends(get_db)`로 주입하면 요청마다 세션이 하나 열리고, 응답이 끝나면 `async with`가 닫아 준다. 노션 교재는 동기 방식(`psycopg2`, `sessionmaker`, `try/finally: db.close()`)이고 수업은 비동기 방식이다.

| 구분          | 동기 (교재)                         | 비동기 (수업)                                        |
| ------------- | ----------------------------------- | ---------------------------------------------------- |
| 드라이버      | `postgresql+psycopg2`               | `postgresql+asyncpg`                                 |
| 엔진 / 세션   | `create_engine` / `sessionmaker`    | `create_async_engine` / `async_sessionmaker`         |
| 쿼리·커밋     | `db.execute(...)`, `db.commit()`    | `await session.execute(...)`, `await session.commit()` |
| 경로 함수     | `def`                               | `async def`                                          |
| 지연 로딩     | 속성에 접근하면 그때 자동 조회 가능 | 자동 조회 불가 → 미리 불러오기(eager loading) 필요    |

### 5) 테이블 만들기 — lifespan과 create_all

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_models()                                      # 모델 파일을 import해 Base에 등록
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)  # 없는 테이블만 생성
    yield                                              # 여기서부터 서버가 요청을 받음
    await close_db()                                   # 종료 시 커넥션 풀 정리(engine.dispose)

app = FastAPI(lifespan=lifespan)
```

- `Base`(`DeclarativeBase`를 상속)는 모든 모델의 부모다. 모델 파일이 import되어야 `Base.metadata`에 등록되므로 `init_models()`에서 모델 모듈을 불러온다.
- `create_all`은 없는 테이블만 만든다. 이미 있는 테이블에 컬럼을 추가·변경해도 반영되지 않는다. 운영에서는 Alembic 같은 마이그레이션 도구로 변경 이력을 관리한다. 실습 중 모델을 바꿨는데 DB가 그대로면 테이블을 지우고 다시 만들어야 할 수 있다.
- `create_all`은 동기 함수라 비동기 연결에서는 `run_sync`로 감싸 실행한다.

### 6) 모델과 컬럼 설정

| 옵션                          | 뜻                                               | 수업 코드 예                                                          |
| ----------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| `primary_key=True`            | 행을 구분하는 기본키                             | `Board.id: Mapped[str]` (문자열 키 `"qna"`), `Post.id`는 `BigInteger` 자동 증가 |
| `nullable=False`              | NULL 금지(NOT NULL)                              | 제목·내용                                                             |
| `index=True`                  | 검색을 빠르게 하는 색인                          | `category`, `board_id`                                                |
| `default` / `server_default`  | 파이썬에서 넣는 기본값 / DB가 넣는 기본값        | `write_role="ALL"`, `is_active=True`                                  |
| `onupdate`                    | 수정할 때마다 넣을 값                            | `modified_at`                                                         |
| `ForeignKey("boards.id", ondelete="CASCADE")` | 다른 테이블 행을 가리키는 외래키. 부모가 지워지면 DB가 자식도 삭제 | `Post.board_id`                                           |
| `Mapped[X \| None]`           | NULL 허용 컬럼                                   | `modified_at`, `deleted_at`                                           |

⚠️ 기본값 함수는 호출하지 말고 함수 자체를 넘긴다. `default=datetime.now(timezone.utc)`는 모듈을 불러올 때 한 번만 시각을 계산해 고정하므로, 이후 모든 행이 서버를 켠 시각으로 저장된다. `default=lambda: datetime.now(timezone.utc)` 또는 `server_default=func.now()`처럼 '그때그때 계산'되게 써야 한다. `onupdate`도 같다. (수업 코드에 이렇게 쓰여 있어서 직접 확인해 볼 부분)

`deleted_at`은 행을 실제로 지우지 않고 '지운 시각'만 기록하는 소프트 삭제용 컬럼이다.

### 7) 관계 — relationship, back_populates, cascade

게시판(Board) 하나에 게시글(Post) 여러 개가 속한다. 게시판 → 게시글은 1:N, 게시글 → 게시판은 N:1이다. 외래키(`board_id`)는 N쪽(Post)에 둔다.

```python
class Board(Base):
    posts: Mapped[list["Post"]] = relationship(
        back_populates="board_config",  # Post.board_config와 양방향 연결
        lazy="selectin",                # 1:N은 IN 조건으로 2차 쿼리
        cascade="all, delete-orphan",   # 게시판을 지우면 글도, 게시판에서 빠진 글도 삭제
    )

class Post(Base):
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    board_config: Mapped["Board"] = relationship(back_populates="posts", lazy="joined")  # N:1은 JOIN
```

| 설정                         | 뜻                                                                 | 기억할 점                                                                    |
| ---------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `relationship`               | 외래키로 연결된 객체를 속성처럼 쓰게 함                            | `post.board_config.name`, `board.posts`                                      |
| `back_populates`             | 양쪽 관계를 서로 이어 줌                                           | 양쪽 이름을 서로 맞게 적어야 함                                              |
| `cascade="all, delete-orphan"` | ORM에서 부모 작업(저장·삭제)을 자식에게 전파                     | `ondelete="CASCADE"`는 DB가, `cascade`는 SQLAlchemy가 처리. 둘은 다른 층     |
| `uselist=False`              | 1:1 관계                                                           | 교재 Owner–OwnerDetail. 외래키에 `unique=True`로 DB에서도 강제               |
| `secondary=연결테이블`       | N:N 관계                                                           | 교재 Pet–Vet. 두 외래키를 모은 연결 테이블 필요                              |

### 8) 세션으로 CRUD — 1차 캐시와 수정 감지

| 작업     | 코드 (비동기)                                            | 기억할 점                                                                                  |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 생성     | `session.add(obj)` → `await session.commit()`            | `add`는 '저장 예정' 표시. `commit` 해야 DB에 반영                                          |
| 단건 조회 | `await session.get(Board, "qna")`                       | 기본키로 조회. 같은 세션에서 이미 불러온 객체면 DB에 다시 묻지 않고 메모리에서 반환(1차 캐시·identity map) |
| 수정     | `board.name = "..."` → `await session.commit()`          | 따로 update 호출 없이 속성만 바꾸면 세션이 변화를 감지해 UPDATE 실행(Dirty Checking)        |
| 삭제     | `await session.delete(obj)` → `await session.commit()`   | `cascade` 설정에 따라 자식도 함께 삭제                                                      |
| 다시 읽기 | `await session.refresh(obj)`                             | DB가 만든 값(자동 증가 id, 기본값, `modified_at`)을 객체에 반영                            |
| 목록 조회 | `await session.scalars(select(Post).where(...))`         | `scalars`는 행 튜플을 벗겨 객체 목록으로. 하나면 `session.scalar(...)`                      |

1차 캐시는 세션 하나 안에서만 유지된다. 요청마다 새 세션을 쓰므로, 다른 요청끼리 캐시를 공유하는 것은 아니다.

### 9) 연관 데이터 불러오기 — N+1, joinedload, selectinload

게시판 10개를 조회(1번)한 뒤 반복문에서 각 게시판의 글 목록에 접근할 때마다 쿼리가 나가면 1 + 10번이 된다. 이것이 N+1 문제다. 처음 조회할 때 연관 데이터를 함께 불러오도록(eager loading) 정하면 해결된다.

| 방식                                   | 쿼리 모양                                                        | 어울리는 관계 / 수업 예                                   |
| -------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
| `joinedload` / `lazy="joined"`         | 처음부터 `LEFT OUTER JOIN`으로 한 번에                           | N:1 (글 → 게시판). `/test/4`                              |
| `selectinload` / `lazy="selectin"`     | 1차: 부모 조회 → 2차: `WHERE board_id IN (...)`로 자식 한꺼번에 | 1:N (게시판 → 글 목록). `/test/5`                         |
| `lazy="select"` (기본값)               | 속성에 처음 접근할 때 그때 조회                                  | N+1의 원인. 비동기 세션에서는 자동 조회 자체가 오류   |
| `lazy="raise"`                         | 미리 안 불러온 관계에 접근하면 오류                              | 실수로 N+1을 만드는 것을 막는 용도                        |

1:N에 `joinedload`를 쓰면 게시판 행이 글 수만큼 반복되어 돌아오므로 `.unique()`가 필요하고 전송량도 늘어난다. 그래서 컬렉션(목록)은 보통 `selectinload`, 단일 객체는 `joinedload`를 쓴다.

수업 코드 주석에 'lazy: raise 기본값'이라고 되어 있는데, SQLAlchemy의 기본값은 `select`(지연 로딩)다. 다만 비동기 세션에서는 지연 로딩이 막혀 있어서 결과적으로 '안 불러온 관계에 접근하면 오류'처럼 동작한다.

모델에 `lazy="selectin"`을 걸어 두면 `session.get(Board, ...)`만 해도 글 목록까지 항상 같이 불러온다. 매번 필요하지 않다면 모델에는 기본값을 두고, 쿼리마다 `.options(selectinload(...))`로 정하는 편이 쓸데없는 조회를 줄인다.

### 10) 동시성 문제와 비관적 락 — 남은 좌석 1개를 두 명이 동시에

콘서트 좌석이 1개 남았는데 두 사람이 동시에 예약하면, 둘 다 '비어 있음'을 읽고 둘 다 예약에 성공할 수 있다. 여러 요청이 같은 데이터를 동시에 고치다 결과가 꼬이는 이 현상을 경합 상태(Race Condition)라고 한다.

비관적 락은 '충돌이 날 것'이라고 보고, 읽는 순간부터 그 행에 자물쇠를 거는 방식이다. SQLAlchemy에서는 쿼리 뒤에 `.with_for_update()`를 붙이면 SQL `SELECT ... FOR UPDATE`가 된다.

```python
stmt = select(ConcertSeat).where(ConcertSeat.id == seat_id).with_for_update()  # 읽으면서 행 잠금
seat = (await session.execute(stmt)).scalar_one_or_none()
if seat.is_reserved:
    raise HTTPException(status_code=400, detail="이미 예약된 좌석입니다.")
seat.is_reserved = True
seat.reserved_by = user_name
await session.commit()  # 커밋(또는 롤백)할 때 잠금이 풀림
```

흐름: A가 잠금을 걸고 읽음 → B는 같은 행을 읽으려다 대기 → A가 예약 후 커밋(잠금 해제) → B가 그제서야 읽음 → `is_reserved=True`를 보고 `400`.

| 확인할 점            | 내용                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| 잠금이 유지되는 기간 | 트랜잭션이 끝날 때(`commit`/`rollback`)까지. 잠금 중에 오래 걸리는 일을 하면 다른 요청이 계속 기다림 |
| 확인과 수정은 한 트랜잭션 안에서 | 잠금 → 확인 → 수정 → 커밋을 한 세션에서. 중간에 커밋하면 잠금이 풀려 의미가 없음           |
| 다른 방법            | 낙관적 락: 잠그지 않고 버전 번호(`version`) 컬럼으로 '내가 읽은 뒤 누가 바꿨는지' 확인. 충돌이 드물 때 |
| 주의                 | 여러 행을 서로 다른 순서로 잠그면 서로 기다리다 멈추는 교착 상태(deadlock)가 생길 수 있음          |

### ⭐️ 필수 (실무 핵심 90%) - 반드시 기억

| 용어/문법                                    | 뜻                                          | 기억할 점 / 주의점                                             |
| -------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| `.env` + `load_dotenv` + `os.getenv`         | 접속 정보를 코드 밖에서 읽기                | 값은 문자열. 변수 이름 일치. 비밀값은 저장소에 올리지 않기     |
| `create_async_engine` / 커넥션 풀            | 연결을 미리 열어 두고 돌려쓰기              | `pool_size` + `max_overflow`가 최대 연결 수                    |
| `async_sessionmaker` / `AsyncSession`        | 요청마다 쓰는 DB 대화 창구                  | `expire_on_commit=False`. 끝나면 반드시 닫기(`async with`)     |
| `get_db` + `Depends`                         | 요청마다 세션 주입                          | 오류 시 `rollback`                                             |
| `Mapped` / `mapped_column`                   | 타입 힌트로 컬럼 정의                       | 기본값 함수는 호출하지 말고 함수 자체를 넘기기                 |
| `ForeignKey` / `relationship` / `back_populates` | 테이블 연결과 객체 연결                 | 외래키는 N쪽. 양쪽 이름 맞추기                                 |
| `commit` / `refresh`                         | DB 반영 / DB 값을 객체에 다시 읽기          | `add`만으로는 저장되지 않음                                    |
| Dirty Checking                               | 속성 변경을 감지해 UPDATE                   | 조회한 객체를 고치고 `commit`                                  |
| `joinedload` / `selectinload`                | N:1은 JOIN, 1:N은 IN 2차 쿼리               | 비동기에서는 관계를 미리 불러와야 접근 가능                    |
| `.with_for_update()` (비관적 락)             | 읽는 순간 행 잠금 (`SELECT ... FOR UPDATE`) | 커밋·롤백까지 유지. 확인과 수정을 한 트랜잭션에서              |

### 💡 참고 (검색용) - 이해만 하고 넘어가기

| 패턴/문법                    | 뜻                                   | 필요할 때 찾는 팁                                         |
| ---------------------------- | ------------------------------------ | --------------------------------------------------------- |
| `MissingGreenlet`            | 비동기에서 몰래 DB 조회하려다 난 오류 | 관계 미리 불러오기, `expire_on_commit=False`, `refresh`   |
| Alembic                      | DB 스키마 변경 이력 관리             | `create_all`이 기존 테이블을 안 바꿀 때                   |
| `lifespan`                   | 서버 시작·종료 시 실행할 코드        | 테이블 생성, 커넥션 풀 정리                               |
| `.unique()`                  | JOIN으로 중복된 부모 행 정리         | 1:N `joinedload` 결과에 필요                              |
| 소프트 삭제 (`deleted_at`)   | 실제 삭제 대신 삭제 시각 기록        | 조회할 때 `deleted_at IS NULL` 조건을 같이 걸어야 함       |
| `uselist=False` / `secondary` | 1:1 / N:N 관계                      | 교재 6.2, 6.3                                             |
| `server_default=func.now()`  | DB가 현재 시각을 기본값으로          | 파이썬 밖(DB 도구)에서 넣어도 적용                        |

---

## 3. 예제 및 실습

### 예제 1 — 게시판·게시글 테스트 라우터 (수업 코드 backend_project_ax1 `sqlalchemy` 브랜치, 미실행)

수업 코드의 `src/board/presentation/test_router.py`를 요청 순서대로 정리했다. 학습용이라 생성·삭제도 `GET`으로 만들어져 있다. 실제 API라면 생성은 `POST`, 삭제는 `DELETE`를 쓴다.

```python
@router.get("/1")  # 게시판 1개 + 글 5개 생성
async def test1(session: AsyncSession = Depends(get_db)):
    board = Board(id="qna", name="제목1")
    session.add(board)
    for i in range(1, 6):
        session.add(Post(title=f"제목{i}", content=f"내용{i}", board_config=board))  # 객체로 연결 → board_id 자동
    await session.commit()

@router.get("/2")  # 조회 → 속성 수정 → 커밋 = UPDATE
async def test2(session: AsyncSession = Depends(get_db)):
    board = await session.get(Board, "qna")
    board.name = "(수정)" + board.name      # update 호출 없이 변경 감지
    await session.commit()
    await session.refresh(board)            # modified_at 등 DB 값 다시 읽기

@router.get("/4")  # N:1 — 글을 조회하면서 게시판을 JOIN으로 함께
async def test4(session: AsyncSession = Depends(get_db)):
    stmt = select(Post).options(joinedload(Post.board_config)).where(Post.board_id == "qna")
    items = await session.scalars(stmt)
    return [(i.to_dict(), i.board_config.to_dict()) for i in items]

@router.get("/5")  # 1:N — 게시판 조회 후 IN 조건으로 글 목록
async def test5(session: AsyncSession = Depends(get_db)):
    stmt = select(Board).options(selectinload(Board.posts)).where(Board.id == "qna")
    board = await session.scalar(stmt)
    return [post.to_dict() for post in board.posts]
```

| 요청                             | 예상 결과                                                     | 확인하려는 차이                                           |
| -------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| `GET /test/1`                    | `200`, `null`. `boards` 1행, `posts` 5행                     | 관계 객체로 연결하면 외래키가 자동으로 채워짐             |
| `GET /test/1` (한 번 더)         | `500` (기본키 `qna` 중복으로 `IntegrityError`)               | 같은 기본키는 다시 넣을 수 없음                           |
| `GET /test/2`                    | 로그에 `name=(수정)제목1`, `modified_at` 값                  | Dirty Checking으로 UPDATE                                 |
| `GET /test/4` (`SQL_ECHO=true`) | 글 5개 + 각 게시판 정보. SQL은 `LEFT OUTER JOIN` 1번          | joinedload                                                |
| `GET /test/5` (`SQL_ECHO=true`) | 글 5개. SQL은 `boards` 조회 1번 + `posts ... IN (...)` 1번    | selectinload                                              |
| `GET /test/3`                    | 게시판 삭제 → 글 5개도 삭제                                   | `cascade` / `ondelete="CASCADE"`                          |

```bash
# DB 안을 직접 확인 (Docker의 postgres 컨테이너)
docker exec -it postgres psql -U postgres -c "SELECT id, name FROM boards;"
docker exec -it postgres psql -U postgres -c "SELECT id, title, board_id FROM posts;"
```

### 실행 결과

- 정상적으로 된 부분: 직접 요청 후 작성
- 새롭게 확인한 부분: 직접 작성
- 추가 확인: `SQL_ECHO=true`로 /test/4와 /test/5의 SQL 개수 비교, `/test/1`을 두 번 호출했을 때 오류, 여러 행의 `created_at`이 같은 시각으로 들어가는지 직접 확인 후 작성

---

## 4. 실수 및 트러블슈팅

### 발생한 문제 요약

- 상황: 실제 겪은 문제를 직접 작성
- 원인: 직접 확인 후 작성
- 해결: 직접 적용한 내용 작성
- 해결 결과: 같은 요청을 다시 보내 상태 코드·응답·SQL 로그·DB 내용을 확인한 뒤 작성

### AI 코드와 실습을 확인할 때 사용할 기준 (아직 미실행)

- [ ] `DATABASE_URL` 형식(`://`)과 `.env` 변수 이름이 코드와 맞는가? 숫자 값은 `int()`로 바꾸는가?
- [ ] `.env`가 `.gitignore`에 들어 있는가?
- [ ] 엔진은 하나만 만들고, 세션은 요청마다 열고 반드시 닫는가? 오류 시 `rollback` 하는가?
- [ ] 비동기 세션에 `expire_on_commit=False`가 있고, 관계는 미리 불러오는가(`MissingGreenlet` 방지)?
- [ ] 모델 파일이 import되어 `create_all` 대상에 들어가는가? 기존 테이블 변경은 반영되지 않는다는 걸 알고 있는가?
- [ ] 시간 기본값을 함수 호출 결과가 아니라 함수(또는 `server_default`)로 넘기는가?
- [ ] 외래키가 N쪽에 있고 `back_populates` 이름이 양쪽에서 맞는가?
- [ ] 삭제 시 자식 데이터를 어떻게 할지(`cascade`, `ondelete`, 소프트 삭제) 정했는가?
- [ ] 목록 조회에서 N+1이 생기지 않는지 SQL 로그로 확인했는가? 1:N에는 `selectinload`, N:1에는 `joinedload`를 썼는가?
- [ ] 재고·좌석처럼 동시에 고칠 수 있는 데이터는 `with_for_update()`로 잠그고, 확인·수정·커밋을 한 트랜잭션에서 하는가?

---

## 5. 오늘의 핵심

- ⭐️ 반드시 기억할 내용: 엔진(커넥션 풀)은 하나, 세션은 요청마다. 모델 속성을 바꾸고 `commit` 하면 DB가 바뀐다. 연관 데이터는 N:1은 `joinedload`, 1:N은 `selectinload`로 미리 불러온다.
- 💡 참고로 알아둘 내용: 접속 정보는 `.env`에서 읽는다. `create_all`은 없는 테이블만 만들고, 변경은 마이그레이션 도구가 맡는다.
- ⚠️ 헷갈리기 쉬운 주의점: 비동기 세션에서는 지연 로딩이 막혀 있다. `default=datetime.now(...)`처럼 호출 결과를 넘기면 시각이 고정된다. `cascade`(ORM)와 `ondelete`(DB)는 다른 층이다.
- 한 문장 요약: 데이터를 DB에 남기려면 엔진·세션·모델로 연결하고, 연관 데이터를 몇 번의 쿼리로 가져오는지까지 확인해야 한다.

---

## 6. 느낀 점과 다음 학습

- 잘 이해한 부분: 직접 작성
- 아직 어려운 부분: 직접 작성
- 다음에 복습할 내용: 직접 선택·작성 — 비동기 세션과 expire_on_commit, 관계 설정과 cascade, joinedload·selectinload와 N+1, 기본값 함수 전달 중 필요한 내용
- 오늘의 느낀 점: 직접 작성
