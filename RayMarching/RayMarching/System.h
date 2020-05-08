#pragma once
#include <vector>
#include "Vec2.h"

class System {
public:
	double dt = 0.02;
	double time = 0.3;
	std::vector<Vec2> points;

	System();
	~System();

	void step();
};
                                                                                                                                                                                                                                                                                       