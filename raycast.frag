#version 330
#extension GL_ARB_separate_shader_objects : enable

uniform sampler2D texEntry;
uniform sampler2D texExit;
uniform sampler3D texVolume;
uniform sampler2D texTFFull;
uniform sampler2D texTFBack;
uniform vec3 volSize;
uniform float stepSize;
uniform float scalarMin;
uniform float scalarMax;
uniform int nLights;
uniform struct Light {
    vec3 direction;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float shininess;
} lights[10];

layout (location = 0) in vec2 vf_texLoc;

layout (location = 0) out vec4 o_color;

// TODO: tricubic interpolation

vec3 makeGradient(vec3 spot)
{
    vec3 gradient;
    gradient.x = 0.5 * (texture(texVolume, spot + vec3(1.f/volSize.x, 0.f, 0.f)).r
                      - texture(texVolume, spot - vec3(1.f/volSize.x, 0.f, 0.f)).r);
    gradient.y = 0.5 * (texture(texVolume, spot + vec3(0.f, 1.f/volSize.y, 0.f)).r
                      - texture(texVolume, spot - vec3(0.f, 1.f/volSize.y, 0.f)).r);
    gradient.z = 0.5 * (texture(texVolume, spot + vec3(0.f, 0.f, 1.f/volSize.z)).r
                      - texture(texVolume, spot - vec3(0.f, 0.f, 1.f/volSize.z)).r);
    return gradient;
}

vec3 entryGradient(vec2 viewSpot)
{
    float delta = 1.0 / 80000.f;
    vec3 left = texture(texEntry, viewSpot + vec2(-delta, 0.0)).xyz;
    vec3 right = texture(texEntry, viewSpot + vec2(delta, 0.0)).xyz;
    vec3 top = texture(texEntry, viewSpot + vec2(0.0, delta)).xyz;
    vec3 bottom = texture(texEntry, viewSpot + vec2(0.0, -delta)).xyz;
    return cross(top - bottom, right - left);
}

vec4 getLightFactor(vec3 grad, vec3 view)
{
    if (nLights == 0)
        return vec4(1.0, 1.0, 1.0, 1.0);
    vec3 V = normalize(-view);
    vec3 N = normalize(-grad);
    vec4 acc = vec4(0.0, 0.0, 0.0, 0.0);
    for (int i = 0; i < nLights; ++i)
    {
        vec3 kd = lights[i].diffuse;
        vec3 ka = lights[i].ambient;
        vec3 ks = lights[i].specular;
        float shininess = lights[i].shininess;
        vec3 L = normalize(-lights[i].direction);
        vec3 R = normalize(-reflect(L, N));
        vec3 diffuse = kd * max(dot(L, N), 0.f);
        vec3 specular = ks * pow(max(dot(R, V), 0.f), shininess);
        vec3 cf = ka + diffuse + specular;
        float af = 1.f;
        acc += vec4(cf, af);
    }
    return vec4(acc.rgb, 1.0);
}

void main(void)
{
    vec3 entry = texture(texEntry, vf_texLoc).xyz;
    vec3 exit = texture(texExit, vf_texLoc).xyz;
    vec3 dir = normalize(exit - entry);
    float baseSample = 0.01;
    float maxLength = length(exit - entry);
    maxLength = min(maxLength, 2.0);
    //int totalSteps = int(maxLength / stepSize);
    vec2 scalar = vec2(0.0, 0.0); // a segment of the ray, X as the scalar value at the end of the segment, and Y as the scalar value at the beginning of the segment.
    scalar.y = texture(texVolume, entry).r;
    scalar.y = clamp((scalar.y - scalarMin) / (scalarMax - scalarMin), 0.0, 1.0);
    vec3 spotCurr;
    vec4 lfPrev = getLightFactor(entryGradient(vf_texLoc), dir);
    vec4 lfCurr;
    vec4 acc = vec4(0.0);
    for (int step = 1; step * stepSize < maxLength; ++step)
    {
        vec3 spotCurr = entry + dir * (step * stepSize);
        scalar.x = texture(texVolume, spotCurr).r;
        scalar.x = clamp((scalar.x - scalarMin) / (scalarMax - scalarMin), 0.0, 1.0);
        vec4 colorFull = texture(texTFFull, scalar);
        vec4 colorBack = texture(texTFBack, scalar);
        vec4 colorFront = colorFull - colorBack;
        lfCurr = getLightFactor(makeGradient(spotCurr), dir);
        acc += (colorBack * lfCurr + colorFront * lfPrev) * (1.0 - acc.a);
        if (acc.a > 0.999)
        {
            acc.a = 1.0;
            break;
        }
        scalar.y = scalar.x;
        lfPrev = lfCurr;
    }
    o_color = acc;
//    o_color = vec4(entry, 1.0);
}

