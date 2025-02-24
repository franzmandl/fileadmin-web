all:: lint test build

build::
	npm run build

clean::
	rm -rf ./build ./node_modules

lint::
	npm run lint

start::
	BROWSER=none REACT_APP_KNOWN_TASK_ACTIONS='[{"keys": ["20-backlog", "BacklogTask"], "friendlyName": "Backlog", "className": "bg-secondary text-light"}, {"keys": ["40-to_do", "To_DoTask"], "friendlyName": "To Do", "className": "bg-warning text-dark"}, {"keys": ["50-in_progress"], "friendlyName": "In Progress", "className": "bg-primary text-light"}, {"keys": ["50-watching"], "friendlyName": "Watching", "className": "bg-primary text-light"}, {"keys": ["60-done", "DoneTask"], "friendlyName": "Done", "className": "bg-success text-light"}, {"keys": ["80-aborted", "AbortedTask"], "friendlyName": "Aborted", "className": "bg-danger text-light"}]' npm run start

test::
	CI=true npm run test
