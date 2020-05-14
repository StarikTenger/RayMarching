uniform vec2     iResolution;           // viewport resolution (in pixels)
uniform float     iTime;           // viewport resolution (in pixels)
uniform vec3 camPos;
uniform vec2 camDir;
uniform sampler2D tex;
uniform int mode;

#define PI 3.141693
#define INF 1000
#define MAX_DIST 1000
#define STEP .4

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

// Objects
struct Cam {
  	vec3 pos;
	vec2 dir;
};

struct Sphere {
	vec3 pos;
    vec3 col;
    
    float r;
    float mirrorK;
	bool invert;
};
    
struct Light{
	vec3 pos;
    vec3 col;
};
    
struct Scene {
	// Parameters
	int iterations;
	float threshold;
	float iTime;

	// Info
	int steps;

	// Object
	vec3 light;

    Cam cam;
};

float distPlane(vec3 pos, vec3 p, vec3 d) {
	d = normalize(d);
	return length(pos - p)*dot(normalize(pos - p), d);
}

float distTorus(vec3 pos, vec3 p, vec3 d, vec3 r0, vec3 r1){
	float h = distPlane(pos, p, d);
	float l = distance(pos, p);
	float s = sqrt(l*l - h*h);
	return sqrt((s-r0)*(s-r0) + h*h) - r1;
}

float distSphere(vec3 pos, vec3 p, float r) {
	float d = distance(pos, p) - r;
	return d;
}

float distSea(vec3 pos){
	return  pos.z - 1 + (sin(pos.x * .1 + iTime)*0.01
	+ sin(pos.x * 5 + 5*iTime*1.11)*0.01/2
	+ sin(pos.x * 10 + 5*iTime*2.11)*0.01/4
	+ sin(pos.y *  + iTime*0.83)*0.01
	+ sin(pos.y * 5 + 5*iTime*1.23)*0.01/2
	+ sin(pos.y * 10 + 5*iTime*2.23)*0.01)
	*0.5
	;
}

float distBiba(vec3 pos){
	pos.y += sin(pos.y * 50) * 0.01/3;

	float dTor = distTorus(pos, vec3(0,0,0), vec3(1,0,0), 3, 0.5);
	float dCut = -pos.z + 2;
	float dCut1 = -pos.y - 1.4;
	
	//float dE1 = distSphere(pos, 0);
	//float dE2 = distSphere(pos, 1);
	//float dE = smin(dE1, dE2, 0.1);

	//float dEnd = distSphere(pos, 2);

	float stick = max(max(dTor, dCut), dCut1);
	return 0;
	//return smin(smin(stick, dE, 0.1), dEnd, 0.2);
}

float distSpiral(vec3 pos) {
	float ang = atan2(pos.x, pos.y);
	float st = 0.2 * 2;
	float r = 0.1 * 2;
	float R = 0.1 * 2;

	
	pos.z = mod(pos.z, st);
	pos.z += ang /2/PI * st;
	
	
	return min(
		distTorus(pos, vec3(0, 0, 0), vec3(0, 0, 1), R, r), 
		distTorus(pos, vec3(0, 0, st), vec3(0, 0, 1), R, r)
	);
}

float distGyroid(vec3 pos, vec3 shift, float scale, float r, float a, float b) {
	pos -= shift;
	pos *= scale / max(a, b);
	return (dot(sin(pos * a), cos(pos.zxy * b)) - r) / scale ;
}

float dist(vec3 pos) {
	float sphere = distSphere(pos, vec3(0,0,0), 2);
	float sphere1 = distSphere(pos, vec3(0,0,0), 1.8);
	//pos.xy = rotate(pos.xy, iTime*0.3);
	float a = max(pos.x - 1, -pos.x - 1);
	float b = max(pos.y - 1, -pos.y - 1);
	float box = max(max(a, b), max(pos.z - 1, -pos.z - 1));

	//float g = distGyroid(pos, vec3(0, 0, 0), 7, -1.6, 1, 1);
	//float g1 = distGyroid(pos, vec3(0, 0, 0), 7, -1.6 + sin(iTime + pos.x*5)*.1, 5, 6);
	//float g2 = distGyroid(pos, vec3(0, 0, 0), 10, -1.6, 2, 3) * .4;
	//float g3 = distGyroid(pos, vec3(0, 0, 0), 26, -1.6, 6, 7) * .4;
	float g = 0;
	float g1 = distGyroid(pos, vec3(0, 0, 0), 7, -1.9, 1, 1);
	float g2 = distGyroid(pos, vec3(0, 0, 0), 15.3, -.9, 1, 1);
	float g3 = distGyroid(pos, vec3(0, 0, 0), 29, -1.8, 1, 1);

	g += g1;
	g -= g2 * (0.6 + sin(iTime*0.2 + pos.x*0.1) * 0.1 );
	g -= g3 * 0.2;

	//g += g3 * 0.25;
	//return max(smin(g - g2 + g3, g1, 0.02), -pos.x); 
	return max(g, -g1);
}

vec3 normal(vec3 pos) {
	float d = dist(pos);
    vec2 e = vec2(.01, 0);
    
    vec3 n = d - vec3(
        dist(pos - e.xyy),
        dist(pos - e.yxy),
        dist(pos - e.yyx));
    
    return normalize(n);
}

vec3 grad(vec3 pos) {
	float d = dist(pos);
    vec2 e = vec2(.01, 0);
    
    vec3 n = d - vec3(
        dist(pos - e.xyy),
        dist(pos - e.yxy),
        dist(pos - e.yyx));
    
    return n / e.x;
}

// Ray marching

vec3 collision(Scene scene, vec3 pos, vec3 dir){
	dir = normalize(dir);

	float minDist = INF;
	for (int i = 0; i < scene.iterations; i++) {
		

		float d = dist(pos);

		if(d < minDist)
			minDist = d;
		
		if (d  < scene.threshold){
			return pos;
		}

		pos += dir * d * STEP;
	}

	return vec3(INF, INF, INF);
}

vec3 rayMarch (Scene scene, vec3 pos, vec3 dir) {

	vec3 col = {0.5, 0.5, 0.5};
	//col *= 0;

	dir = normalize(dir);

	float k = 1;

	float minDist = INF;
	for (int i = 0; i < scene.iterations; i++) {
		float d = dist(pos);
		if(d < minDist)
			minDist = d;

		if (d < scene.threshold){
			//col = rotate(vec3(1, 0, 0), vec2(pos.x, pos.y));
			col = vec3(1, 1, 1);
			break;
		}
		pos += dir * d * STEP;
		scene.steps += 1;
		k *= 0.95;
	}


	if(minDist < scene.threshold){
		col *= normal(pos) * .5 + .5;
		//if(abs(distGyroid(pos, vec3(0, 0, 0), 40, -1.2, 1, 1)) < 0.01)
		//	col = length(col.xy);
	}
	if(minDist > scene.threshold || distance(scene.cam.pos, pos) > MAX_DIST){
		if(mode){
			float a = (atan(dir.x, dir.y) + PI) / PI / 2;
			float xy = sqrt(dir.x*dir.x + dir.y*dir.y);
			float b = atan(xy, dir.z)/ PI;
			col = texture2D(tex, vec2(a, b)).rgb;
		}
	}
	
	float d =  distance(pos, camPos);

	return col * min(1., 2. / d / d);
}

void main() {
	vec2 uv = gl_FragCoord/iResolution.yy - vec2(0.5, 0.5);   
	vec3 col = {0, 0, 0}; 

	// Scene
	Scene scene;
	scene.iterations = 50;
	scene.threshold = 0.07;
	scene.iTime = iTime;
	scene.steps = 0;

	scene.light = normalize(vec3(-1, -2, 1)) * 1.;
	if(mode)
		scene.light *= 0.5;

	// Camera
    scene.cam.dir = camDir;
    scene.cam.pos = camPos;

	vec3 ray = normalize(rotate(vec3(0.5, uv), scene.cam.dir));
	col = vec3(0, 0, 0);
	col += rayMarch(scene, scene.cam.pos, ray);

	vec3 coll = collision(scene, scene.cam.pos, ray);

	float refK = 1;
	for (int i = 0; i < 4*mode; i++) {
		refK *= 0.5;

		vec3 coll = collision(scene, scene.cam.pos, ray);
		if(distance(coll, scene.cam.pos) > MAX_DIST)
			break;
		scene.cam.pos = coll;
		vec3 n = normal(scene.cam.pos);
	
		scene.cam.pos += n * 0.05;
		ray -= n*dot(n, ray)*2;
		scene.cam.pos += ray*0.01;

		col += rayMarch(scene, scene.cam.pos, ray) * refK;	
	}

	//col = col - col * float(scene.steps) *0.9;
	
	// Output to screen
	gl_FragColor = vec4(col.x, col.y, col.z, 1);
}