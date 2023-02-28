all:: lint test build

build::
	npm run build

clean::
	rm -rf ./build ./node_modules

lint::
	npm run lint

start::
	BROWSER=none REACT_APP_KNOWN_TASK_ACTIONS='{  "50-watching": {"friendlyName": "Watching", "className": "bg-primary text-light"}  }' npm run start

test::
	CI=true npm run test
