"""Original geometry, offline static art test. Run with Blender --background --python.

Outputs stay in quarantine. No purchased meshes, copied textures, image generation,
terrain modification, or production runtime dependency. Dimensions are art units.
"""
import bpy
import json
import math
import random
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / '.codex-tmp/qa/original-foliage-blender'
OUT.mkdir(parents=True, exist_ok=True)
RNG = random.Random(91026)
LIGHT = json.loads((ROOT / 'public/career-world/layers/world-backdrop/manifests/world-light-r1.json').read_text(encoding='utf-8'))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def linear(hex_color):
    values = [int(hex_color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values) + (1,)


def material(name, dark, light, scale=5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = .94
    bsdf.inputs['Specular IOR Level'].default_value = .12
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = 1.3
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .26
    ramp.color_ramp.elements[0].color = linear(dark)
    ramp.color_ramp.elements[1].position = .76
    ramp.color_ramp.elements[1].color = linear(light)
    links.new(noise.outputs['Fac'], ramp.inputs[0])
    links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


pine = material('Pine | olive painted-mass approximation', '#46543b', '#8c9165', 5.5)
pine_tip = material('Pine | muted upper growth', '#536044', '#999b70', 7)
bark = material('Bark | warm grey brown', '#3d3528', '#81735a', 9)
cap_mat = material('Caps | aged russet', '#653c2b', '#be8655', 3.8)
gill_mat = material('Gills | ochre parchment', '#70613e', '#b0a077', 9)
stem_mat = material('Stems | moss stained ivory', '#777451', '#d0bd8d', 5)
speck_mat = material('Cap scales | dull cream', '#b4a17a', '#d5c79b', 6)


def mesh(name, vertices, faces, mat, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = smooth
    return obj


def branch(name, points, radii, mat=bark):
    vertices, faces = [], []
    for i, (point, radius) in enumerate(zip(points, radii)):
        p = Vector(point)
        tangent = Vector(points[min(i+1, len(points)-1)]) - Vector(points[max(0, i-1)])
        axis = tangent.normalized().cross(Vector((0, 1, 0))).normalized()
        second = tangent.normalized().cross(axis).normalized()
        for j in range(8):
            v = p + radius * (axis * math.cos(j*math.tau/8) + second * math.sin(j*math.tau/8))
            vertices.append(tuple(v))
        if i:
            for j in range(8):
                faces.append(((i-1)*8+j, (i-1)*8+(j+1)%8, i*8+(j+1)%8, i*8+j))
    faces.extend([tuple(reversed(range(8))), tuple(range((len(points)-1)*8, len(points)*8))])
    return mesh(name, vertices, faces, mat, True)


def frond(name, origin, angle, length, width, droop, mat):
    """A folded, tapered bough mass, with uneven lateral lobes and true thickness."""
    along = Vector((math.cos(angle), math.sin(angle), 0))
    across = Vector((-math.sin(angle), math.cos(angle), 0))
    origin = Vector(origin)
    vertices, faces = [], []
    rows = 11
    for i in range(rows):
        t = i / (rows-1)
        reach = length * t
        spread = width * math.sin(math.pi * t) ** .65
        spread *= (1.0 if i % 2 else .68) * RNG.uniform(.89, 1.1)
        center = origin + along * reach + Vector((0, 0, .19*math.sin(math.pi*t)-droop*t*t))
        vertices.extend([tuple(center-across*spread-Vector((0,0,.10*math.sin(math.pi*t)))),
                         tuple(center+Vector((0,0,.10*math.sin(math.pi*t)))),
                         tuple(center+across*spread-Vector((0,0,.13*math.sin(math.pi*t))))])
        if i:
            a = (i-1)*3
            faces.extend([(a,a+3,a+4,a+1),(a+1,a+4,a+5,a+2)])
    obj = mesh(name, vertices, faces, mat, True)
    solid = obj.modifiers.new('Needle mass thickness', 'SOLIDIFY')
    solid.thickness = .025
    return obj


branch('Pine trunk', [(0,0,0),(.03,0,2),(-.04,.02,5),(.06,0,8),(0,0,11.8)], [.17,.135,.085,.044,.008])
for i in range(6):
    a = i*math.tau/6
    branch('Pine root %02d' % i, [(0,0,.20),(.23*math.cos(a),.23*math.sin(a),.07),(.46*math.cos(a),.46*math.sin(a),.012)], [.10,.06,.008])
for tier in range(7):
    z = 2.2 + tier * 1.38
    radius = 1.55 * (1-tier/8.0) ** .8
    count = 5 if tier < 5 else 4
    for j in range(count):
        angle = j*math.tau/count + tier*1.78 + RNG.uniform(-.16,.16)
        length = radius * RNG.uniform(.82,1.14)
        origin = (.015,0,z+RNG.uniform(-.16,.16))
        joint = bpy.data.objects.new('Pine bough pivot %02d-%02d' % (tier,j), None)
        bpy.context.collection.objects.link(joint)
        joint.location = origin
        pieces = [branch('Bough wood', [origin,(math.cos(angle)*length*.5,math.sin(angle)*length*.5,z+.02),(math.cos(angle)*length,math.sin(angle)*length,z-.32)], [.044,.025,.004])]
        pieces.append(frond('Pine primary bough', origin, angle, length, length*.29, .31, pine))
        for side in (-1,1):
            for k, t in enumerate((.37,.68)):
                start = (math.cos(angle)*length*t, math.sin(angle)*length*t, z+.05-.26*t*t)
                pieces.append(frond('Pine lateral spray', start, angle+side*.59, length*(.57-.12*k), length*(.18-.025*k), .23, pine_tip if tier > 6 else pine))
        for obj in pieces:
            obj.parent = joint
            # Geometry is authored in absolute coordinates; convert to pivot-local space.
            obj.location = -Vector(origin)
for j in range(5):
    frond('Pine leader', (0,0,10.9), j*math.tau/5, .35, .10, -.35, pine_tip)
pine_objects = list(bpy.context.scene.objects)
# Sculpt for the declared high-oblique sprite view: retain actual branch geometry
# but compress depth along the viewing bearing, revealing the tier separations.
# This is deliberately view-specific source art, not a general-purpose 3D tree.
depth_axis = Vector((math.sin(math.radians(157.5)),math.cos(math.radians(157.5)),0))
def sprite_sculpt(v):
    result = Vector(v) - depth_axis * Vector(v).dot(depth_axis) * .62
    result.z *= 1.18
    return result
for obj in pine_objects:
    obj.location = sprite_sculpt(obj.location)
    if obj.type == 'MESH':
        for vertex in obj.data.vertices:
            vertex.co = sprite_sculpt(vertex.co)


def mushroom(index, position, radius, height, angle):
    cx, cy = position
    lean = .13 * height
    branch('Mushroom %d stem' % index, [(cx,cy,0),(cx+lean*.3,cy,height*.5),(cx+lean,cy,height)], [radius*.18,radius*.135,radius*.18], stem_mat)
    vertices, faces = [], []
    rings, segments = 11, 64
    for ring in range(rings):
        theta = ring / (rings-1) * math.pi / 2
        for j in range(segments):
            a = j*math.tau/segments
            r = radius * math.sin(theta) * (1+.045*math.sin(a*5+angle)+.027*math.cos(a*9))
            z = height + radius*.46*math.cos(theta)**1.25 + .035*math.sin(a*4+angle)*math.sin(theta)
            vertices.append((cx+lean+r*math.cos(a),cy+r*math.sin(a),z))
            if ring:
                b = (ring-1)*segments+j
                faces.append((b,ring*segments+j,ring*segments+(j+1)%segments,(ring-1)*segments+(j+1)%segments))
    obj = mesh('Mushroom %d scalloped cap' % index, vertices, faces, cap_mat, True)
    solid = obj.modifiers.new('Rolled cap rim', 'SOLIDIFY')
    solid.thickness = .045
    underside = [(cx+lean,cy,height-.08)] + vertices[-segments:]
    mesh('Mushroom %d underside' % index, underside, [(0,j+1,(j+1)%segments+1) for j in range(segments)], gill_mat, True)
    for j in range(18):
        a = j*2.39996+angle
        r = radius*math.sqrt((j+.4)/19)*.88
        z = height+radius*.46*(1-(r/radius)**2)**.625+.012
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=(cx+lean+r*math.cos(a),cy+r*math.sin(a),z))
        spot = bpy.context.object
        spot.name = 'Mushroom %d irregular cap scale' % index
        s = radius*RNG.uniform(.027,.066)
        spot.scale = (s,s*.8,.013)
        spot.data.materials.append(speck_mat)


for i, args in enumerate([((0,0),.51,.96,.3),((.64,-.28),.35,.57,1.4),((-.45,-.39),.25,.39,3),((.20,.46),.28,.66,4)]):
    mushroom(i, *args)
mushroom_objects = [o for o in bpy.context.scene.objects if o not in pine_objects]

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 768
scene.render.resolution_y = 768
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
world = bpy.data.worlds.new('Shared ambient')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = linear(LIGHT['ambientColor'])
world.node_tree.nodes['Background'].inputs[1].default_value = .8
scene.world = world
bearing, elevation = math.radians(157.5), math.radians(72)
view = Vector((math.sin(bearing)*math.cos(elevation), math.cos(bearing)*math.cos(elevation), math.sin(elevation)))
bpy.ops.object.camera_add(location=view*30)
camera = bpy.context.object
camera.name = 'Offline sprite camera | SSE 72 degrees elevation'
camera.rotation_euler = (-view).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 7.5
scene.camera = camera
right = camera.rotation_euler.to_matrix() @ Vector((1,0,0))
up = camera.rotation_euler.to_matrix() @ Vector((0,1,0))
dx,dy,dz = LIGHT['direction']
light_direction = (right*dx-up*dy+view*dz).normalized()
bpy.ops.object.light_add(type='SUN', location=light_direction*20)
sun = bpy.context.object
sun.name = LIGHT['id']
sun.rotation_euler = (-light_direction).to_track_quat('-Z','Y').to_euler()
sun.data.energy = LIGHT['intensity'] * 2
sun.data.color = linear(LIGHT['color'])[:3]
sun.data.angle = math.radians(6)
manifest = {'status':'quarantine-static-candidate', 'source':'original procedural Blender geometry', 'seed':91026,
            'light':LIGHT, 'offlineExposureMultiplier':2, 'pineViewSculpt':{'depthScale':.38,'heightScale':1.18}, 'camera':{'elevationDegrees':72,'bearingDegrees':157.5,'orthographicScale':7.5},
            'projectionNote':'Offline interpretation of authored high-oblique contract; live 2D camera untouched. Visual registration remains provisional.', 'assets':{}}
for name, visible, target in [('pine',pine_objects,Vector((0,0,5.5))),('mushrooms',mushroom_objects,Vector((0,0,.5)))]:
    for obj in pine_objects+mushroom_objects:
        obj.hide_render = obj not in visible
    camera.location = target + view*30
    bpy.context.view_layer.update()
    root = world_to_camera_view(scene,camera,Vector((0,0,0)))
    manifest['assets'][name] = {'file':name+'.png','size':[768,768],'rootPx':[root.x*768,(1-root.y)*768], 'pixelsPerUnit':768/7.5}
    scene.render.filepath = str(OUT / (name+'.png'))
    bpy.ops.render.render(write_still=True)
for obj in pine_objects+mushroom_objects:
    obj.hide_render = False
for obj in mushroom_objects:
    obj.location += right*2.4
camera.location = Vector((0,0,4))+view*30
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'original-foliage.blend'))
(OUT / 'render-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('FOLIAGE_RENDER_COMPLETE', OUT)
