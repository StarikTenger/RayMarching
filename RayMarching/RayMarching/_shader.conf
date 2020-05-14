uniform vec2     iResolution;           // viewport resolution (in pixels)
uniform float     iTime;           // viewport resolution (in pixels)
uniform vec3 camPos;
uniform vec2 camDir;
//uniform sampler2D tex;

#define PI 3.141693
#define INF 1000
#define MAX_DIST 50

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
	float distSphere(vec3 pos, int i);
	float dist(vec3 pos);
	vec3 normal(vec3 pos);
};

float Scene::distPlane(vec3 pos, vec3 p, vec3 d) {
	d = normalize(d);
	return length(pos - p)*dot(normalize(pos - p), d);
}

float Scene::distSphere(vec3 pos, int i) {
	vec3 p1 = pos;
	vec3 p2 = spheres[i].pos;

	float k = 0.02 * 0.5 * 0.5*0;
	float per = 10;
	//p1.x = p1.x + cos(p1.y * per + time*5) * k;
	//p1.z = p1.z + sin(p1.x * per + time*5) * k;
	//p1.y = p1.y + sin(p1.z * per + time*5) * k;
	
	//p1.x = sin(p1.x + 0.05*sin(p1.z * 30) );
	//p1.y = sin(p1.y );
	//p1.z = sin(p1.z );

	float d = distance(p1, p2) - spheres[i].r;
	if(spheres[i].invert)
		d = -d;

	return d;
}

float Scene::dist(vec3 pos){
	
	vec3 p1 = pos;

//	float dPlane = pos.z+ (sin(pos.x *  + time)*0.01
//	+ sin(pos.x * 5 + 5*time*1.11)*0.01/2
//	+ sin(pos.x * 10 + 5*time*2.11)*0.01/4
//	+ sin(pos.y *  + time*0.83)*0.01
//	+ sin(pos.y * 5 + 5*time*1.23)*0.01/2
//	+ sin(pos.y * 10 + 5*time*2.23)*0.01)
//	*0.5
//	;
	
	float dPlane = pos.z;

	float dPlane1 = pos.z - 1; 

	
	float d0 = distSphere(pos, 0);
	float d1 = distSphere(pos, 1);
	//float d2 = distSphere(pos, 2);
	//float d3 = distSphere(pos, 3);

	//float d = smin(max(smin(d0, dPlane, 1.34), dPlane1), d1, 1.1);
	float d = d0;

	return d;
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

		pos += dir * d;
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
			col = vec3(1, 1, 1);
			break;
		}
		pos += dir * d;
		scene.steps += 1;
		k *= 0.95;
	}


	if(minDist < scene.threshold){
		col *= dot(scene.normal(pos), scene.light);
		//col.x = max(0, col.x);
		//col.y = max(0, col.x);
		//col.z = max(0, col.x);
	}
	//if(minDist > scene.threshold || distance(scene.cam.pos, pos) > MAX_DIST){
		//float a = (atan(dir.x, dir.y) + PI) / PI / 2;
		//float xy = sqrt(dir.x*dir.x + dir.y*dir.y);
		//float b = atan(xy, dir.z)/ PI;
		//col = texture2D(tex, vec2(a, b)).rgb;
	//}
	

	return col;
}

void main() {
	vec2 uv = gl_FragCoord/iResolution.xy - vec2(0.5, 0.5);   
	vec3 col = {0, 0, 0}; 

	// Scene
	Scene scene;
	scene.iterations = 10;
	scene.threshold = 0.01;
	scene.time = iTime;
	scene.steps = 0;

	scene.light = normalize(vec3(1, 1, 1)) *1 ;

	scene.spheres[0] = Sphere(vec3(1, 1, 1), vec3(1.0, 1.0, 1.0)*1.0, 1.35/4, 0.1, 0);
	scene.spheres[1] = Sphere(vec3(1, 1, 1.72), vec3(1.0, 1.0, 1.0)*1.0, 1.35/8, 0.1, 0);

	// Camera
    scene.cam.dir = camDir;
    scene.cam.pos = camPos;

	//vec3 ray = normalize(rotate(vec3(1, uv), scene.cam.dir));
	//col = vec3(0, 0, 0);
	col = rayMarch(scene, scene.cam.pos, normalize(rotate(vec3(1, uv), scene.cam.dir)));

	float refK = 1;
//	for (int i = 0; i < 0; i++) {
//		refK *= 0.9;
//
//		vec3 coll = collision(scene, scene.cam.pos, ray);
//		if(distance(coll, scene.cam.pos) > MAX_DIST)
//			break;
//		scene.cam.pos = coll;
//		vec3 n = scene.normal(scene.cam.pos);
//	
//		scene.cam.pos += n * 0.05;
//		ray -= n*dot(n, ray)*2;
//		scene.cam.pos += ray*0.01;
//
//		col += rayMarch(scene, scene.cam.pos, ray) * refK;	
//	}

	//col = col - col * float(scene.steps) *0.9;
	
	// Output to screen
	gl_FragColor = vec4(col.x, col.y, col.z, (iResolution.x*2.0 - iResolution.x*1.0 - iResolution.x*1.0)+ 1 + iTime);
}