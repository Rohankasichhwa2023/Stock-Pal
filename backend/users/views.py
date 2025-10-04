from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password
from .models import User
from .serializers import UserSerializer

@api_view(['POST'])
def register_user(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'message': 'User registered successfully'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login_user(request):

    data = request.data
    username = data.get('username')
    password = data.get('password')

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'Invalid username or password'},
                        status=status.HTTP_400_BAD_REQUEST)

    if not check_password(password, user.password):
        return Response({'error': 'Invalid username or password'},
                        status=status.HTTP_400_BAD_REQUEST)

    serializer = UserSerializer(user)
    return Response({'message': 'Login successful', 'user': serializer.data},
                    status=status.HTTP_200_OK)
