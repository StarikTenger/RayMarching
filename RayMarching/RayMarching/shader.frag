uniform vec2     iResolution;           // viewport resolution (in pixels)
uniform float     iTime;           // viewport resolution (in pixels)
uniform vec3 camPos;
uniform vec2 camDir;
uniform sampler2D tex;
uniform int mode;
uniform float gravity;

#define PI 3.141693
#define INF 1000.
#define MAX_DIST 10000.
#define THRESHOLD 0.001
#define ITERATIONS 500
#define STEP 1.

vec3 light = vec3(0., 0., -1.);


// Geometry
vec2 rotate(vec2 v, float a){
	return vec2(v.x * cos(a) - v.y * sin(a), v.x * sin(a) + v.y * cos(a));
}

vec3 rotate(vec3 v, vec2 ang){
    
    vec2 p = rotate(vec2(v.x, v.z), ang.y);
	v = vec3(p.x, v.y, p.y);
    
    v = vec3(rotate(vec2(v.x, v.y), ang.x), v.z);

    return v;
}

// Polynomial smooth minimum by iq
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5*(a-b)/k, 0.0, 1.0);
  return mix(a, b, h) - k*h*(1.0-h);
}

float smax(float a, float b, float k) {
	return a + b - smin(a, b, k);
}

float distPlane(vec3 pos, vec3 p, vec3 d) {
	d = normalize(d);
	return length(pos - p)*dot(normalize(pos - p), d);
}

float distTorus(vec3 pos, vec3 p, vec3 d, float r0, float r1){
	float h = distPlane(pos, p, d);
	float l = distance(pos, p);
	float s = sqrt(l*l - h*h);
	return sqrt((s-r0)*(s-r0) + h*h) - r1;
}

float distSphere(vec3 pos, vec3 p, float r) {
	float d = distance(pos, p) - r;
	return d;
}

float distSea(vec3 pos) {
	return  pos.z - 1. + sin(pos.x) * 0.2
	;
}

float distSpiral(vec3 pos) {
	float ang = atan2(pos.x, pos.y);
	float st = 0.2 * 2.;
	float r = 0.1 * 2.;
	float R = 0.1 * 2.;

	
	pos.z = mod(pos.z, st);
	pos.z += ang /2./PI * st;
	
	
	return min(
		distTorus(pos, vec3(0., 0., 0.), vec3(0., 0., 1.), R, r), 
		distTorus(pos, vec3(0., 0., st), vec3(0, 0, 1), R, r)
	);
}

float distGyroid(vec3 pos, vec3 shift, float scale, float r, float a, float b) {
	pos -= shift;
	pos *= scale / max(a, b);
	return (dot(sin(pos * a), cos(pos.zxy * b)) - r) / scale ;
}

float distBox (vec3 pos, vec3 a, vec3 b, float smoothK) {
	if(a.x > b.x){
		float swap = a.x;
		a.x = b.x;
		b.x = swap;
	}
	if(a.y > b.y){
		float swap = a.y;
		a.y = b.y;
		b.y = swap;
	}
	if(a.z > b.z){
		float swap = a.z;
		a.z = b.z;
		b.z = swap;
	}


	float d_x = min(b.x - pos.x, pos.x - a.x);
	float d_y = min(b.y - pos.y, pos.y - a.y);
	float d_z = min(b.z - pos.z, pos.z - a.z);

	return -smin(d_x, smin(d_y, d_z, smoothK), smoothK);
}

float dist(vec3 pos);

vec3 normal(vec3 pos) {
	float d = dist(pos);
    vec2 e = vec2(.01, 0);
    
    vec3 n = d - vec3(
        dist(pos - e.xyy),
        dist(pos - e.yxy),
        dist(pos - e.yyx));
    
    return normalize(n);
}

// Color gradient
vec3 grad(vec3 pos) {
	float d = dist(pos);
    vec2 e = vec2(.0001, 0);
    
    vec3 n = d - vec3(
        dist(pos - e.xyy),
        dist(pos - e.yxy),
        dist(pos - e.yyx));
    
    return n / e.x;
}

// Ray marching

vec3 collision(vec3 pos, vec3 dir) {
	dir = normalize(dir);

	for (int i = 0; i < ITERATIONS; i++) {
		float d = dist(pos);

		if (d < THRESHOLD){
			return pos;
		}	
		
		float v = abs(dir.x) + abs(dir.y) + abs(dir.z);
		float t = (-v + sqrt(pow(v, 2.) + 2. * gravity * d)) / gravity;
		if (abs(gravity) < 1./INF) {
			t = d / v;
		}
		dir.z -= gravity * t;
		pos += dir * t;
		pos.z -= gravity * t * t / 2.;
		
	}

	return vec3(INF, INF, INF);
}


float dist(vec3 pos) {
	vec3 posPrev = pos;
	vec3 koeff = vec3(0.9, 0.9, 0.9);
	pos.x = mod(pos.x, 2.0*koeff.x);
	pos.y = mod(pos.y, 2.0*koeff.y);
	pos.z *= 0.7;
	//pos.z = mod(pos.z, 2.0*koeff.z);
	//float box = -distBox(pos, vec3(-0.1*koeff.x, -0.1*koeff.y, -0.1*koeff.z), vec3(2.1*koeff.x, 2.1*koeff.y, 2.1*koeff.z), 0.5*koeff.z);
	float box = -distSphere(pos, vec3(1.*koeff.x, 1.*koeff.y, 1.*koeff.z), 1.4*koeff.x);
	return min(box, posPrev.z-0.2);
	//return distGyroid(pos, vec3(0.,0.,0.), 0.1, .0, 1., 1.);
}

vec3 rayMarch (vec3 pos, vec3 dir) {
	float gravity1 = gravity;
	vec3 col = vec3(0.5, 0.5, 0.5);
	//col *= 0;

	dir = normalize(dir);

	float k = 1.;

	float minDist = INF;
	for (int i = 0; i < ITERATIONS; i++) {
		float d = dist(pos);
		if(d < minDist) 
			minDist = d;

		if (d < THRESHOLD){
			col = vec3(1., 1., 1.);
			break;
		}	
		
		float gravity = gravity1;// * pos.x * 0.1;
		float v = abs(dir.x) + abs(dir.y) + abs(dir.z);
		float t = (-v + sqrt(pow(v, 2.) + 2. * gravity * d)) / gravity;
		if (abs(gravity) < 1./INF) {
			t = d / v;
		}
		//t *= 0.5;
		dir.z -= gravity * t;
		pos += dir * t;
		pos.z -= gravity * t * t / 2.;
		k *= 0.98;
		//scene.steps += 1;
		
	}


	if(minDist < THRESHOLD) {
		col *= 0.5 + pow(dot(normal(pos), light), 1.);
		col *= normal(pos) * .5 + .5;
		//col = vec3(length(col.xy), 0., 0.);
	}
	
	float d =  distance(pos, camPos);

	return col * k * min(1., 400. / d / d);
}

void main() {
	vec2 uv = (gl_FragCoord/iResolution.xy - vec2(0.5, 0.5)) * normalize(iResolution.xy);   
	vec3 col = vec3(0.,0.,0.); 
	gravity *= 0.1;

	// Scene

	light = normalize(vec3(-1, -2, 1)) * 0.5;


	vec3 ray = normalize(rotate(vec3(0.5, uv), camDir));
	col = vec3(0, 0, 0);
	col += rayMarch(camPos, ray);
	
	// Reflections
	vec3 coll = collision(camPos, ray);

	float refK = 0.9;
	vec3 camPos = camPos;
	for (int i = 0; i < 2; i++) {
		refK *= 0.5;

		vec3 coll = collision(camPos, ray);
		if(distance(coll, camPos) > MAX_DIST)
			break;
		camPos = coll;
		vec3 n = normal(camPos);
	
		camPos += n * 0.05;
		ray -= n*dot(n, ray)*2.;
		camPos += ray*0.01;

		col += rayMarch(camPos, ray) * refK;	
	}

	//col = col - col * float(scene.steps) *0.9;


	// Output to screen
	gl_FragColor = vec4(col.x, col.y, col.z, 1);
}