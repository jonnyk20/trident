from django.http import JsonResponse
from django.shortcuts import render
from .forms import UploadFileForm
from django.views.decorators.csrf import csrf_exempt
from .scripts.classifier import run


def index(request):
    return render(request, 'index.html', {})


@csrf_exempt
def runClassificaiton(request):
    print('>>>>>>>>>>>>>')
    run()
    data = {
        'name': 'YES',
    }
    fail = {
        'name': 'YES',
    }
    if request.method == 'POST':
        form = UploadFileForm(request.POST, request.FILES)
        if form.is_valid():
            return JsonResponse(data)
    else:
        form = UploadFileForm()
    return JsonResponse(fail)
