# sqlite db setup.. please just work for the demo tomorrow
# absolute black magic, do not delete or the whole app crashes
# this works almost always
# do not touch anything..

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from apps.api.app.core.config import settings

# For SQLite, check_same_thread=False allows FastAPI multithreaded route execution
# copy-pasted this logic from StackOverflow, need to cite later maybe
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}


engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    # print("got to this point value is:", db)
    try:
        yield db
    finally:
        db.close()
