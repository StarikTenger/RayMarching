#include "DrawSystem.h"
#include "getMilliCount.h"
#include <math.h>
#include <algorithm>
#include <SFML/Graphics.hpp>
#include <SFML/Window.hpp>

#include <iostream>



DrawSystem::DrawSystem() {
	window = new sf::RenderWindow(sf::VideoMode(600, 600), "Long live the King!");
	loadTextures();

	textureSpr.loadFromFile("image.png");
	tex.loadFromFile("sky2.jpg");
	
	shader.loadFromFile("shader.frag", sf::Shader::Fragment);
}

DrawSystem::~DrawSystem(){}

void DrawSystem::drawScene() {
	System& sys = *system;

	w = window->getSize().x;
	h = window->getSize().y;

	sf::Sprite spr;
	spr.setPosition(0, 0);
	spr.setTexture(textureSpr);

	
	

	shader.setUniform("iResolution", sf::Vector2f(w, h));
	shader.setUniform("iTime", float(getMilliCount() / 1000.));
	shader.setUniform("camPos", camPos);
	shader.setUniform("camDir", camDir);
	shader.setUniform("gravity", gravity);
	

	window->draw(spr, &shader);
	
}

void DrawSystem::drawInterface() {
	
}

void DrawSystem::draw() {
	System& sys = *system;
	//window->clear();

	drawScene();
	
	drawInterface();
}
