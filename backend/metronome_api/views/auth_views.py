from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
import json

@csrf_exempt
@require_http_methods(["POST"])
def admin_login(request):
    """Admin login endpoint"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({'error': 'Username and password required'}, status=400)
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None and user.is_staff:
            login(request, user)
            return JsonResponse({
                'success': True,
                'username': user.username,
                'token': 'dummy-token'  # You can implement proper token auth if needed
            })
        else:
            return JsonResponse({'error': 'Invalid credentials or not an admin'}, status=401)
            
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["POST"])
def admin_logout(request):
    """Admin logout endpoint"""
    logout(request)
    return JsonResponse({'success': True})

@login_required
def check_admin_auth(request):
    """Check if user is authenticated as admin"""
    if request.user.is_staff:
        return JsonResponse({
            'authenticated': True,
            'username': request.user.username
        })
    return JsonResponse({'authenticated': False}, status=401)
