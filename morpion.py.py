import json
PLAYER_ARG = {
	"name" : "players",
	"type" : "int",
	"min" : 2,
	"max" : 2,
	"description" : "number of players"
}



def read_json():
	content = input()
	opening_curly_brackets = content.count("{")
	closing_curly_brackets = content.count("}")
	while opening_curly_brackets < 1 or closing_curly_brackets != opening_curly_brackets:
		content += input()
		opening_curly_brackets = content.count("{")
		closing_curly_brackets = content.count("}")
	content = content.strip()
	content = json.loads(content)
	return content

def print_error(type, **kwargs):
	quit = kwargs.pop("fatal", False)
	d = {"type":type}
	d.update(kwargs)
	print(json.dumps({"errors":[d]}, indent=2))
	if quit:
		exit()



def init(grid):
	content = read_json()
	if "init" not in content:
		print_error("BAD_FORMAT", 
			message="init key is missing", 
			fatal=True)
	init_content = content["init"]
	if "players" not in init_content : 
		print_error("MISSING_ARGUMENT", 
			arg=PLAYER_ARG, 
			fatal=True)
	if init_content["players"] != 2:
		print_error("INCORRECT_VALUE", 
			arg=PLAYER_ARG, 
			value=init_content["players"],
			fatal=True)
	if len(init_content)>1:
		for k,v in init_content.items():
			if k != "players":
				print_error("UNEXPECTED_ARGUMENT", 
					argname=k, 
					value=v,
					fatal=True)

	print(json.dumps(grid.current_instructions, indent=2))



def turn(grid):
	content = read_json()
	if "actions" not in content:
		print_error("BAD_FORMAT", 
			message="actions key is missing")
		return False
	actions = content["actions"]
	if not isinstance(actions, list):
		print_error("BAD_FORMAT", 
			message="actions value is not a list")
		return False
	if len(actions) != 1:
		print_error("BAD_FORMAT", 
			message="exactly one action is expected")
		return False
	action = actions[0]
	if not isinstance(action, dict):
		print_error("BAD_FORMAT", 
			message="action is not a dict containing player, x and y values")
	if not {"x", "y","player"}.issubset(action.keys()):
		print_error("BAD_FORMAT", 
			message="action is not a dict containing player, x and y values")
	if int(action["player"]) != grid.current_player:
		print_error("MISSING_ACTION", 
			player=grid.current_player,
			requested_action=grid.current_action)		
		return False
	try:
		score = grid.click(int(action["x"]), int(action["y"]))
	except AttributeError:
		print_error("WRONG_ACTION", 
			subtype="OUT_OF_ZONE",
			player=grid.current_player,
			action=action,
			requested_action=grid.current_action)
		return False	
	print(json.dumps(grid.current_instructions, indent=2))

	return score != 0



def str_all_values(content):
	if isinstance(content, dict):
		for k,v in content.items():
			content[k] = str_all_values(v)

	elif isinstance(content, list):
		for i,v in enumerate(content):
			content[i] = str_all_values(v)
	else:
		content = str(content)
	return content


class Grid:
	def __init__(self, case_size=100):
		self.__case_size = case_size
		self.__grid = [[0]*3 for x in range(3)]
		self.__current_player = 1

	def check_winner(self):
		grid = self.__grid
		for i in range(3):
			if grid[0][i] != 0: 
				if all(grid[j][i] == grid[0][i] for j in range(1,3)):
					return grid[0][i]
			if grid[i][0] != 0: 
				if all(grid[i][j] == grid[i][0] for j in range(1,3)):
					return grid[i][0] 
		if grid[0][0] != 0: 
			if all(grid[j][j] == grid[0][0] for j in range(1,3)):
				return grid[0][0]
		if grid[0][2] != 0: 
			if all(grid[j][2-j] == grid[0][2] for j in range(1,3)):
				return grid[0][2]
		return 0

	def click(self, x, y):
		x = x//self.__case_size
		y = y//self.__case_size
		if x < 0 or x > 2:
			raise AttributeError("x not in range")
		if y < 0 or y > 2:
			raise AttributeError("y not in range")
		if self.__grid[x][y] != 0:
			raise AttributeError("case already taken")
		self.__grid[x][y] = self.__current_player
		self.__current_player = 1 if self.__current_player == 2 else 2
		return self.check_winner()


	@property
	def clickable_zones(self):
		zones = []
		for x in range(3):
			for y in range(3):
				if self.__grid[x][y] == 0:
					zones.append({
						"x":x*self.__case_size,
						"y":y*self.__case_size,
						"width":self.__case_size,
						"height":self.__case_size
						})
		return zones


	@property
	def current_player(self):
		return self.__current_player
	

	@property
	def current_action(self):
		return {
			"type" : "CLICK",
			"player": self.current_player,
			"zones" : self.clickable_zones
		}

	@property
	def current_display(self):
		content = [
			{"tag":"style", "content": "line{stroke:black;stroke-width:4;}"}
		]

		for i in range(1,3):
			content.append({
				"tag":"line", 
				"x1":0, 
				"y1":i*self.__case_size,
				"x2":3*self.__case_size,
				"y2":i*self.__case_size
				})

			content.append({
				"tag":"line", 
				"x1":i*self.__case_size,
				"y1":0, 
				"x2":i*self.__case_size,
				"y2":3*self.__case_size
				})

		for x in range(3):
			for y in range(3):
				if self.__grid[x][y] == 0:
					continue
				color = "blue"
				if self.__grid[x][y] == 2:
					color = "red"
				content.append({
					"tag":"circle",
					"cx":int((0.5+x)*self.__case_size),
					"cy":int((0.5+y)*self.__case_size),
					"r":self.__case_size//3,
					"fill":color
					})
		return str_all_values({
			"width":self.__case_size*3,
			"height":self.__case_size*3,
			"content":content
		})

	@property
	def current_instructions(self):
		display = self.current_display 
		scores = [0,0]
		game_over = False
		winner = self.check_winner()
		if winner:
			game_over = True 
			scores[winner-1] = 1
		return {
			"displays":[{**display, "player":1},{**display, "player":2}],
			"requested_actions":[self.current_action],
			"game_state":{
				"scores": scores,
				"game_over":game_over
				}
			}
			
if __name__ == "__main__":
	grid = Grid()
	init(grid)
	while not turn(grid):
		pass