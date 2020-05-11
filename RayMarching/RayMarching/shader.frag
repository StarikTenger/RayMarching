uniform vec2     iResolution;           // viewport resolution (in pixels)
uniform float     iTime;           // viewport resolution (in pixels)
uniform vec3 camPos;
uniform vec2 camDir;
uniform sampler2D tex;
uniform int mode;

#define PI 3.141693
#define INF 1000
#define MAX_DIST 1000
#define STEP 0.5

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
	float time;

	// Info
	int steps;

	// Object
	vec3 light;

    Cam cam;
	Sphere spheres[5];
    //Light lights[1];

	float distPlane(vec3 pos, vec3 p, vec3 d);
	float distTorus(vec3 pos, vec3 p, vec3 d, vec3 r0, vec3 r1);
	float distSphere(vec3 pos, vec3 p, float r);
	float distSea(vec3 pos);
	float distBiba(vec3 pos);
	float distSpiral(vec3 pos);
	float dist(vec3 pos);
	vec3 normal(vec3 pos);
};

float Scene::distPlane(vec3 pos, vec3 p, vec3 d) {
	d = normalize(d);
	return length(pos - p)*dot(normalize(pos - p), d);
}

float Scene::distTorus(vec3 pos, vec3 p, vec3 d, vec3 r0, vec3 r1){
	float h = distPlane(pos, p, d);
	float l = distance(pos, p);
	float s = sqrt(l*l - h*h);
	return sqrt((s-r0)*(s-r0) + h*h) - r1;
}

float Scene::distSphere(vec3 pos, vec3 p, float r) {
	float d = distance(pos, p) - r;
	return d;
}

float Scene::distSea(vec3 pos){
	return  pos.z - 1 + (sin(pos.x *  + time)*0.01
	+ sin(pos.x * 5 + 5*time*1.11)*0.01/2
	+ sin(pos.x * 10 + 5*time*2.11)*0.01/4
	+ sin(pos.y *  + time*0.83)*0.01
	+ sin(pos.y * 5 + 5*time*1.23)*0.01/2
	+ sin(pos.y * 10 + 5*time*2.23)*0.01)
	*0.5
	;
}

float Scene::distBiba(vec3 pos){
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

float Scene::distSpiral(vec3 pos) {
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

float Scene::dist(vec3 pos) {
	vec3 p1 = pos;
	//

	p1.x = mod(p1.x, 4);
	p1.y = mod(p1.y, 4);
	p1.xy -= vec2(2, 2);

	p1.y -= sin(p1.z*10) * 0.1;
	p1.x -= sin(p1.z*10) * 0.1;

	p1.xy = rotate(p1.xy, p1.z*0.5);

	float a = max(p1.x - 1, -p1.x - 1);
	float b = max(p1.y - 1, -p1.y - 1);

	return max(max(-max(max(a, b), max(p1.z - 5, -p1.z - 5)), distSea(pos)), -pos.z - 4);
}

vec3 Scene::normal(vec3 pos) {
	float d = dist(pos);
    vec2 e = vec2(.01, 0);
    
    vec3 n = d - vec3(
        dist(pos - e.xyy),
        dist(pos - e.yxy),
        dist(pos - e.yyx));
    
    return normalize(n);
}

// Ray marching

vec3 collision(Scene scene, vec3 pos, vec3 dir){
	dir = normalize(dir);

	float minDist = INF;
	for (int i = 0; i < scene.iterations; i++) {
		

		float d = scene.dist(pos);

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
		float d = scene.dist(pos);
		if(d < minDist)
			minDist = d;

		if (d < scene.threshold){
			//col = rotate(vec3(1, 0, 0), vec2(pos.x, pos.y));
			col = vec3(0.8, 0, 0);
			break;
		}
		pos += dir * d * STEP;
		scene.steps += 1;
		k *= 0.95;
	}


	if(minDist < scene.threshold){
		col *= dot(scene.normal(pos), scene.light);
		col.x = max(0, col.x);
		col.y = max(0, col.y);
		col.z = max(0, col.z);
	}
	if(minDist > scene.threshold || distance(scene.cam.pos, pos) > MAX_DIST){
		if(mode){
			float a = (atan(dir.x, dir.y) + PI) / PI / 2;
			float xy = sqrt(dir.x*dir.x + dir.y*dir.y);
			float b = atan(xy, dir.z)/ PI;
			col = texture2D(tex, vec2(a, b)).rgb;
		}
	}
	

	return col;
}

void main() {
	vec2 uv = gl_FragCoord/iResolution.yy - vec2(0.5, 0.5);   
	vec3 col = {0, 0, 0}; 

	// Scene
	Scene scene;
	scene.iterations = 100;
	scene.threshold = 0.01;
	scene.time = iTime;
	scene.steps = 0;

	scene.light = normalize(vec3(-1, -2, 1)) * 0.5;

	//scene.spheres[0] = Sphere(vec3(1, 1, 1), vec3(1.0, 1.0, 1.0)*1.0, 1.35/4, 0.1, 0);
	//scene.spheres[1] = Sphere(vec3(1, 1, 1.72), vec3(1.0, 1.0, 1.0)*1.0, 1.35/8, 0.1, 0);
	scene.spheres[0] = Sphere(vec3(-0.5, 2.4, 2), vec3(1., 1., 1.), 0.9, 0, 0);
	scene.spheres[1] = Sphere(vec3(0.5, 2.4, 2), vec3(1., 1., 1.), 0.9, 0, 0);
	scene.spheres[2] = Sphere(vec3(0, -1.4, 2.6 ), vec3(1., 1., 1.), 0.6, 0, 0);

	// Camera
    scene.cam.dir = camDir;
    scene.cam.pos = camPos;

	vec3 ray = normalize(rotate(vec3(1, uv), scene.cam.dir));
	col = vec3(0, 0, 0);
	col += rayMarch(scene, scene.cam.pos, ray);

	vec3 coll = collision(scene, scene.cam.pos, ray);
//	if(distance(coll, scene.cam.pos) > MAX_DIST){
//		gl_FragColor =  vec4(0, 0, 0, 1);
//		return;
//	}

	float refK = 1;
	for (int i = 0; i < 4*mode; i++) {
		refK *= 0.5;

		vec3 coll = collision(scene, scene.cam.pos, ray);
		if(distance(coll, scene.cam.pos) > MAX_DIST)
			break;
		scene.cam.pos = coll;
		vec3 n = scene.normal(scene.cam.pos);
	
		scene.cam.pos += n * 0.05;
		ray -= n*dot(n, ray)*2;
		scene.cam.pos += ray*0.01;

		col += rayMarch(scene, scene.cam.pos, ray) * refK;	
	}

	//col = col - col * float(scene.steps) *0.9;
	
	// Output to screen
	gl_FragColor = vec4(col.x, col.y, col.z, (iResolution.x*2.0 - iResolution.x*1.0 - iResolution.x*1.0)+ 1 + iTime);
}