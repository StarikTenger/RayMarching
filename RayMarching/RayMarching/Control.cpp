#include "Control.h"
#include "getMilliCount.h"
#include <iostream>
#include <fstream>
#include <sstream>

Control::Control() {
	for (int i = 0; i < 100; i++) {
		keyMatches.push_back({});
	}
	std::ifstream keys("keys.conf");
	while (keys) {
		std::string key;
		keys >> key;
		while (keys) {
			std::string key1;
			keys >> key1;
			if (key1 == "END")
				break;
			keyMatches[getKey(key1)].push_back(getKey(key));

		}
	}

	drawSys.cam.scale = 250;
}

Control::~Control() {

}

Vec2 Control::getCursorPos() {
	return geom::rotate((mouse.pos - drawSys.cam.border/2) / drawSys.cam.scale, drawSys.cam.angle);
}

void Control::loadConfig() {
	
}


void Control::saveConfig() {
	
}

void Control::step() {
	int timeMs = getMilliCount();
	if (timeMs - timePrev > dt) {
		
		std::cout << (1000.0 / (timeMs - timePrev)) << "\n";
		timePrev = timeMs;

		events();
		drawSys.mouse = mouse;
		
		if (mouse.state) {
			drawSys.cam.pos += (mousePrev.pos - mouse.pos) / drawSys.cam.scale;
		}
		double dS = pow(1.1, mouse.delta);
		drawSys.cam.scale *= dS;
		drawSys.cam.pos += (drawSys.cam.border / 2 - mouse.pos) / drawSys.cam.scale * (1 - dS); //it works

		
		for (int i = 0; i < 1; i++) {
			sys.step();
		}
		
		double lin = 0.04;
		Vec2 xy = {drawSys.camPos.x, drawSys.camPos.y};
		if (keys[W])
			xy += geom::rotate({1, 0}, drawSys.camDir.x) * lin;
		if (keys[S])
			xy -= geom::rotate({ 1, 0 }, drawSys.camDir.x) * lin;
		if (keys[A])
			xy += geom::rotate({ 1, 0 }, drawSys.camDir.x - M_PI/2) * lin;
		if (keys[D])
			xy -= geom::rotate({ 1, 0 }, drawSys.camDir.x - M_PI / 2) * lin;

		if (keys[Z])
			drawSys.gravity -= 0.01;
		if (keys[X])
			drawSys.gravity += 0.01;

		if (keys[SHIFT])
			drawSys.camPos.z -= lin;
		if (keys[SPACE])
			drawSys.camPos.z += lin;
		if (keys[P]) {
			drawSys.shader.setUniform("mode", 1);
		}
		else {
			drawSys.shader.setUniform("mode", 0);
		}
		if (keys[O])
			drawSys.shader.setUniform("tex", drawSys.tex);
		
	
		drawSys.camPos.x = xy.x;
		drawSys.camPos.y = xy.y;

		double ang = 0.05;
		if (keys[LEFT]) {
			drawSys.camDir.x -= ang;
		}
		if (keys[RIGHT]) {
			drawSys.camDir.x += ang;
		}
		if (keys[DOWN]) {
			drawSys.camDir.y -= ang;
		}
		if (keys[UP]) {
			drawSys.camDir.y += ang;
		}



		drawSys.system = &sys;
		drawSys.draw();
		drawSys.window->display();

		
	}
}
