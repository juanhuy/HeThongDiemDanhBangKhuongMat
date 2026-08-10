from pydantic import BaseModel

class UserResponse(BaseModel):
    name: str

    class Config:
        from_attributes = True

class FakeORM:
    def __init__(self, name):
        self._name = name

    @property
    def name(self):
        return self._name

obj = FakeORM("Alice")
res = UserResponse.model_validate(obj)
print(res.model_dump())
