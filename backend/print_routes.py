from app.main import app

with open('all_routes.txt', 'w', encoding='utf-8') as f:
    for route in app.routes:
        if hasattr(route, 'methods'):
            f.write(f"{list(route.methods)} {route.path}\n")
        else:
            f.write(f"ROUTER: {route.path}\n")
