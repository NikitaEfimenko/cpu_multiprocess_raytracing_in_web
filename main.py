from flask import Flask, request, jsonify, render_template, current_app
from flask_socketio import SocketIO, send, emit
import numpy as np
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from raytracing.cast import do_raytracing
from PIL import Image
from time import sleep

from concurrent.futures import ThreadPoolExecutor
executor = ThreadPoolExecutor(2)


def get_pic(data):
    img = Image.fromarray(data, 'RGB')
    file = BytesIO()
    img.save(file, 'PNG')
    file.seek(0)
    jpeg_data = base64.b64encode(file.getvalue())
    return jpeg_data.decode('utf8')


async_mode = None
configBuild = dict(
    static_folder='public/build/static',
    template_folder='public/build'
)

app = Flask(__name__, **configBuild)
app.config.update(
    DEBUG=True,
    SECRET_KEY="io-secter",
    HOST='0.0.0.0'
)
socketio = SocketIO(app, engineio_logger=True, cors_allowed_origins='*', async_mode='threading')

@app.route("/")
def stat():
    return render_template('index.html', async_mode=socketio.async_mode)

def raytracing_compute(scene, camera, sizes):
    trace_data = do_raytracing(scene, camera, (400, 300))
    return get_pic(trace_data)

@socketio.on('click')
def handle_click(click_payload):
    #print(click_payload)
    pass


@socketio.on('screenshot')
def handle_screen_shot(screenshot_payload):
    #print('screenshot request:', screenshot_payload)
    scene, camera = screenshot_payload['objects'], screenshot_payload['camera']
    future = executor.submit(raytracing_compute, scene, camera, (640, 480))
    def emit_screenshot(_fut):
        print(_fut, future)
        socketio.emit('screenshot', {
        'rt_data': future.result()
    })
    future.add_done_callback(emit_screenshot)

if __name__ == '__main__':
    socketio.run(app, debug=True, host="0.0.0.0")
