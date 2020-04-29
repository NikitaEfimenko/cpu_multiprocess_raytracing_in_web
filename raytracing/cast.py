import numpy as np
from PIL import ImageColor
import os
from multiprocessing import Pool


def norm(x):
    return x / (np.linalg.norm(x) + .00001)

def intersect_sphere(O, D, S, R):
    a = np.dot(D, D)
    OS = O - S
    b = 2. * np.dot(D, OS)
    c = np.dot(OS, OS) - R * R
    disc = b * b - 4. * a * c
    if disc > 0:
        distSqrt = np.sqrt(disc)
        q = (-b - distSqrt) / 2.0 if b < 0 else (-b + distSqrt) / 2.0
        t0 = q / a
        t1 = c / q
        t0, t1 = min(t0, t1), max(t0, t1)
        if t1 >= 0:
            return t1 if t0 < 0 else t0
    return np.inf

def intersect_plane(O, D, P, N):
    denom = np.dot(D, N)
    if np.abs(denom) < 1e-6:
        return np.inf
    d = np.dot(P - O, N) / denom
    if d < 0:
        return np.inf
    return d

def intersect(rayO, rayD, obj):
    tp = np.array(obj['geometries'][0]['type'])
    if tp == 'SphereGeometry':
        S, R = np.array(obj['position']), np.array(obj['geometries'][0]['radius'])
        return intersect_sphere(rayO, rayD, S, R)    
    elif tp == 'PlaneGeometry':
        return intersect_plane(rayO, rayD, np.array(obj['position']), np.array([0., 1., 0.]))

def ray_cast(rayO, L, rayD, scene):
    t = np.inf
    for i, obj in enumerate(scene):
        t_obj = intersect(rayO, rayD, obj)
        if t_obj < t:
            t, obj_idx = t_obj, i
    if t == np.inf:
        return
    obj = scene[obj_idx]
    M = rayO + rayD * t
    N = norm(M - np.array(obj['position']))
    toL = norm(L - M)
    toO = norm(rayO - M)
    l = [intersect(M + N * .0001, toL, obj_sh) 
            for k, obj_sh in enumerate(scene) if k != obj_idx]
    if l and min(l) < np.inf:
        return
    ambient = 3.
    diffuse_c = obj['diffuse']
    specular_c = obj['specular_c']
    specular_k = obj['specular_k']
    color_light = np.array(ImageColor.getcolor('#333355', "RGB"))
    color = np.array(ImageColor.getcolor(obj['name'], "RGB"))
    col_ray = ambient
    col_ray += specular_c * max(np.dot(N, toL), 0.) * color
    col_ray += specular_k * max(np.dot(N, norm(toL + toO)), 0.) ** specular_k * color_light
    return obj, M, N, col_ray

def tracer_worker(attr, depth_max = 4):
    depth = 0
    reflection = 1.
    Dij, O, L, scene = attr
    rayO, rayD = O, Dij
    col = np.zeros(3)
    while depth < depth_max:
        traced = ray_cast(rayO, L, rayD, scene)
        if not traced:
            return np.clip(col, 0., 255.)
        obj, M, N, col_ray = traced
        rayO, rayD = M + N * .0001, norm(rayD - 2. * np.dot(rayD, N) * N)
        depth += 1
        col += reflection * col_ray
        reflection *= .3
        #print(col)
    return np.clip(col, 0., 255.)

def do_raytracing(scene, camera, sizes):
    pool = Pool(os.cpu_count())
    fov, aspect, mtx = camera['fov'], camera['aspect'], np.reshape(camera['mtx']['elements'], (4,4))
    O, D = np.array(camera['position']), np.array(camera['direction'])
    width, height = sizes
    h = 2. * np.tan(fov / 2. * 3.1415926 / 180.) * aspect
    w = h
    dw, dh = w / width, h / height
    w2 = int(width / 2.)
    h2 = int(height / 2.)
    dx = norm(mtx[:3, 0])
    dy = norm(np.cross(-D, dx))
    ww = dw * dx
    hh = dh * dy
    L = np.array([300., 1800, 500])
    zipped_wh = [(x, y) for y in range(height) for x in range(width)]
    Dij = map(lambda ij: (D + (ij[0] - w2) * ww + (h2 - ij[1]) * hh, O, L, scene), zipped_wh)
    return np.reshape(pool.map(tracer_worker, Dij), (sizes[1], sizes[0], 3)).astype(np.uint8) 