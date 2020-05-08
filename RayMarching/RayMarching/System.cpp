#include "System.h"
#include "geometry.h"
#include "random.h"

#include <iostream>
#include <fstream>
#include <algorithm>

using namespace geom;
using namespace random;
using namespace std;

System::System(){
	
	Vec2 p(time, 0);
	for (int i = 0; i < 1; i++) {
		points.push_back(p);
	}
}

System::~System() {
}


void System::step() {
	
	time += dt;
}