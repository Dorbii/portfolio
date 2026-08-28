import moderngl, ocean_gl
ctx = moderngl.create_standalone_context(require=330)
for f in ('wave.frag','foam.frag','spray.frag','composite.frag'):
    try:
        p = ctx.program(vertex_shader=ocean_gl._src('quad.vert'), fragment_shader=ocean_gl._src(f))
        print(f, '->', sorted(p._members.keys()))
    except Exception as e:
        print(f, 'FAILED', str(e)[:400])
    print()
