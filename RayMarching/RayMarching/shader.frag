uniform vec2     iResolution;           // viewport resolution (in pixels)
uniform float     iTime;           // viewport resolution (in pixels)
uniform vec3 camPos;
uniform vec2 camDir;


#define PI 3.141693
#define INF 1000
#define MAX_DIST 10

// Geometry

float multiply(vec3 a, vec3 b){
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

vec2 rotate(vec2 v, float a){
	return vec2(v.x * cos(a) - v.y * sin(a), v.x * sin(a) + v.y * cos(a));
}

vec3 rotate(vec3 v, vec2 ang){
    
    vec2 p = rotate(vec2(v.x, v.z), ang.y);
	v = vec3(p.x, v.y, p.y);
    
    v = vec3(rotate(vec2(v.x, v.y), ang.x), v.z);

    return v;
}


float _mod(float x, float y) {
	return x - y * trunc(x/y);
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

	// Object
	vec3 light;

    Cam cam;
	Sphere spheres[5];
    Light lights[1];

	float distSphere(vec3 pos, int i);
	float dist(vec3 pos);
	vec3 normal(vec3 pos);
};

float Scene::distSphere(vec3 pos, int i) {
	vec3 p1 = pos;
	vec3 p2 = spheres[i].pos;

	p1.x = p1.x + cos(p1.y*50+ time*5) * 0.02;
	p1.z =  p1.z + 1*sin(p1.x*50 + time*5)* 0.02;
	p1.y = p1.y + 1*sin(p1.z*50 + time*5) * 0.02;
	
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

	float dPlane = pos.z + 1;
	//float dPlane1 = pos.z - 1;
	float d0 = distSphere(pos, 0);
	//float d1 = distSphere(pos, 1);
	//float d2 = distSphere(pos, 2);
	//float d3 = distSphere(pos, 3);

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
			//return pos;
		}

		pos += dir * d;
	}

	return pos;
}

vec3 rayMarch (Scene scene, vec3 pos, vec3 dir) {
	vec3 col = {0.5, 0.5, 0.5}; 

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
		k *= 1.05;
	}

	
	//col -= 0.15 * vec3(1, 1, 1) / minDist;
	
	

	if(minDist < scene.threshold){
		if(1 || length(collision(scene, pos, scene.light)) > 2){
			col *= multiply(scene.normal(pos), scene.light);
			col.x = max(0, col.x);
			col.y = max(0, col.x);
			col.z = max(0, col.x);
		} else {
			col = vec3(0., 0., 0.);
		}



		col += vec3(1, 1, 1) * 0.1;
	}
	
	col += rotate(vec3(0, 0, 2), vec2(pos.x, pos.y)) / k * 1;
	
	//col *= 5.5 / distance(camPos, pos);

	return col;
}

void main() {
	vec2 uv = gl_FragCoord/iResolution.xy - vec2(0.5, 0.5);   
	vec3 col = {0, 0, 0}; 

	// Scene
	Scene scene;
	scene.iterations = 200;
	scene.threshold = 0.001;
	scene.time = iTime;

	scene.light = normalize(vec3(1, 1, 1));

	scene.spheres[0] = Sphere(vec3(1, 1, 1), vec3(1.0, 1.0, 1.0)*1.0, 1.35/4, 0.1, 0);
	scene.spheres[1] = Sphere(vec3(1, vec2(1, 1) + rotate(vec2(0.2, 0), iTime * 0.3)), vec3(1.0, 1.0, 1.0)*1.0, 0.4, 0.1, 1);
	scene.spheres[2] = Sphere(vec3(1, vec2(1, 1) + rotate(vec2(0.2, 0), iTime)), vec3(1.0, 1.0, 1.0)*1.0, 0.2, 0.1, 0);
	scene.spheres[3] = Sphere(vec3(1, vec2(1, 1) - rotate(vec2(0.2, 0), iTime)), vec3(1.0, 1.0, 1.0)*1.0, 0.4, 0.1, 1);

	scene.lights[0] = Light(vec3(1, 1, 1), vec3(1, 1, 1));
	//scene.lights[1] = Light(vec3(1, 5, sin(iTime  *1.1)), vec3(1, 1, 1));

	// Camera
    scene.cam.dir = camDir;
    scene.cam.pos = camPos;

	vec3 ray = normalize(rotate(vec3(1, uv), scene.cam.dir));
	col = rayMarch(scene, scene.cam.pos, ray) * 0.5;

	float refK = 0.2;
	for(int i = 0; i < 1; i++){
		
		vec3 coll = collision(scene, scene.cam.pos, ray);
		if(distance(coll, scene.cam.pos) > MAX_DIST)
			break;
		scene.cam.pos = coll;
		vec3 n = scene.normal(scene.cam.pos);
	
		scene.cam.pos += n * 0.03;
		ray -= n*dot(n, ray)*2;
		//scene.cam.pos += ray * 0.05;
		col += rayMarch(scene, scene.cam.pos, ray) * refK;

		refK *= 0.1;
	}
	
	

	// Output to screen
	gl_FragColor = vec4(col.x, col.y, col.z, (iResolution.x*2.0 - iResolution.x*1.0 - iResolution.x*1.0)+ 1 + iTime);
}