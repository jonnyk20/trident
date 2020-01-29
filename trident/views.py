from django.http import JsonResponse
from django.shortcuts import render
from .forms import UploadFileForm
from django.views.decorators.csrf import csrf_exempt
from .scripts.classifier import run
import cv2
import numpy as np
import json
from functools import singledispatch

@singledispatch
def to_serializable(val):
    """Used by default."""
    return str(val)


@to_serializable.register(np.float32)
def ts_float32(val):
    """Used if *val* is an instance of numpy.float32."""
    return np.float64(val)


def index(request):
    return render(request, 'index.html', {})


@csrf_exempt
def runClassificaiton(request):
    print('>>>>>>>>>>>>>')
    # run()
    data = {
        'name': 'YES',
    }
    fail = {
        'name': 'NO',
    }
    if request.method == 'POST':
        form = UploadFileForm(request.POST, request.FILES)
        if form.is_valid():
            x = form.cleaned_data['upload']
            y = x.file
            image_bytes = x.read()
            decoded = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), -1)
            res = run(decoded)
            app_json = json.dumps(res, default=to_serializable)
            return JsonResponse(res, safe=False)
        else:
            print('FAIL')
            return JsonResponse(fail)
            pass
