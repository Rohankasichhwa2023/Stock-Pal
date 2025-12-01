from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password
from .tokens import CustomRefreshToken  # Import the custom token
from .models import User
from django.http import JsonResponse
import json
import base64
from .serializers import UserSerializer, RegisterSerializer

def get_tokens_for_user(user):
    refresh = CustomRefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)
    
    print(serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'Invalid username or password'}, status=status.HTTP_401_UNAUTHORIZED)

    if not check_password(password, user.password):
        return Response({'error': 'Invalid username or password'}, status=status.HTTP_401_UNAUTHORIZED)

    tokens = get_tokens_for_user(user)
    return Response({
        'message': 'Login successful',
        'user': UserSerializer(user).data,
        'tokens': tokens
    }, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login_jwt(request):
    """
    POST JSON: { "username": "...", "password": "..." }
    Returns: { success: True, user: {...}, tokens: { access, refresh } }
    Only users with is_admin=True are allowed.
    """
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'username and password required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    # Keep your plaintext-password check since you requested no hashing changes
    if user.password != password:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    if not getattr(user, 'is_admin', False):
        return Response({'error': 'Not an admin user'}, status=status.HTTP_403_FORBIDDEN)

    tokens = get_tokens_for_user(user)
    return Response({
        'success': True,
        'user': UserSerializer(user).data,
        'tokens': tokens
    }, status=status.HTTP_200_OK)
