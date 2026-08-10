INFO:     127.0.0.1:59705 - "POST /api/lop_tin_chi HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\uvicorn\protocols\http\httptools_impl.py", line 422, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        self.scope, self.receive, self.send
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\uvicorn\middleware\proxy_headers.py", line 63, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\applications.py", line 1163, in __call__
    await super().__call__(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\applications.py", line 90, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\middleware\errors.py", line 186, in __call__
    raise exc
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\middleware\errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\middleware\cors.py", line 96, in __call__
    await self.simple_response(scope, receive, send, request_headers=headers)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\middleware\cors.py", line 154, in simple_response
    await self.app(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\middleware\exceptions.py", line 63, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\middleware\asyncexitstack.py", line 18, in __call__
    await self.app(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\routing.py", line 660, in __call__
    await self.middleware_stack(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\routing.py", line 2683, in app
    await route.handle(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\routing.py", line 1753, in handle
    await self.original_router.handle(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\routing.py", line 2738, in handle
    await included_router._handle_selected(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\routing.py", line 1773, in _handle_selected
    await original_route.handle(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\routing.py", line 1264, in handle
    await app(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\routing.py", line 150, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\_exception_handler.py", line 53, in wrapped_app
    raise exc
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\_exception_handler.py", line 42, in wrapped_app
    await app(scope, receive, sender)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\routing.py", line 136, in app
    response = await f(request)
               ^^^^^^^^^^^^^^^^
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\routing.py", line 690, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
    )
    ^
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\fastapi\routing.py", line 346, in run_endpoint_function
    return await run_in_threadpool(dependant.call, **values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\starlette\concurrency.py", line 34, in run_in_threadpool
    return await anyio.to_thread.run_sync(func)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\anyio\to_thread.py", line 65, in run_sync
    return await get_async_backend().run_sync_in_worker_thread(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        func, args, abandon_on_cancel=abandon_on_cancel, limiter=limiter
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 2641, in run_sync_in_worker_thread
    return await future
           ^^^^^^^^^^^^
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\anyio\_backends\_asyncio.py", line 1033, in run
    result = context.run(func, *args)
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\app\api\endpoints\api_credit_classes.py", line 145, in add_credit_class
    generated_class_id = f"{data.subject_id.strip()}_{data.semester}_{random_suffix}"
                                                      ^^^^^^^^^^^^^
  File "D:\test\HeThongDiemDanhBangKhuongMat\backend\.venv\Lib\site-packages\pydantic\main.py", line 1042, in __getattr__
    raise AttributeError(f'{type(self).__name__!r} object has no attribute {item!r}')
AttributeError: 'CreditClassCreate' object has no attribute 'semester'. Did you mean: 'semester_id'?