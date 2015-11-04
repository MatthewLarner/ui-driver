var predator = require('predator');

var types = {
        'button': ['button', 'a'],
        'label': ['label', 'span', 'div'],
        'image': ['img', 'svg'],
        'field': ['input']
    },
    noelementOfType = 'no elements of type ';

function executeKeyPress(key, element, done) {
    element.value += key;

    var keydownEvent = new window.KeyboardEvent('keydown'),
        keyupEvent = new window.KeyboardEvent('keyup'),
        keypressEvent = new window.KeyboardEvent('keypress');

    var method = 'initKeyboardEvent' in keydownEvent ? 'initKeyboardEvent' : 'initKeyEvent';

    keydownEvent[method]('keydown', true, true, window, key, 3, true, false, true, false, false);
    keyupEvent[method]('keyup', true, true, window, key, 3, true, false, true, false, false);
    keypressEvent[method]('keypress', true, true, window, key, 3, true, false, true, false, false);

    element.dispatchEvent(keydownEvent);
    element.dispatchEvent(keyupEvent);
    element.dispatchEvent(keypressEvent);

    done(null, element);
}

function findUi(selectors) {
    return document.querySelectorAll(selectors);
}

function executeNavigate(location, previousResult, done) {
    var callbackTimer;

    function handleWindowError(error) {
        clearTimeout(callbackTimer);

        done(error);
        window.removeEventListener('error', handleWindowError);
    }

    window.addEventListener('error', handleWindowError);
    window.location = location;

    callbackTimer = setTimeout(done, 150);
}

function executeFindUi(value, type, previousResult, done) {
    var elementTypes = types[type];

    if(!elementTypes) {
        return done(new Error(type + ' is not a valid ui type'));
    }

    var elements = findUi(elementTypes);

    if(!elements.length) {
        return done(new Error(noelementOfType + type));
    } else {
        var element;

        for(var i = 0; i < elements.length; i++) {
            var currentElement = elements[i];

            if((currentElement.textContent.toLowerCase() === value.toLowerCase() || currentElement.title.toLowerCase() === value.toLowerCase()) && !predator(currentElement).hidden) {
                element = currentElement;
                break;
            }
        }

        if(!element) {
            return done(new Error(noelementOfType + type + ' with value of ' + value));
        }

        done(null, element);
    }
}

function executeFocus(value, type, previousResult, done) {
    executeFindUi(value, type, previousResult, function(error, element) {
        if(error) {
            return done(error);
        }

        element.focus();
        done(null, element);
    });
}

function executeSetValue(value, element, done) {
    element.value = value;

    done(null, element);
}

function executeClick(value, type, previousResult, done) {
    executeFindUi(value, type, previousResult, function(error, element) {
        if(error) {
            done(error);
        } else {
            var rect = element.getBoundingClientRect();

            var clickElement = document.elementFromPoint(rect.left, rect.top);
            clickElement = (clickElement.textContent.toLowerCase() === value.toLowerCase()) && clickElement;

            if(!element.click) {
                done(new Error('no clickable element with type' + type + ' and value of ' + value));
            } else {
                element.click();
                done(null, element);
            }
        }
    });
}

function executeWait(time, previousResult, done) {
    setTimeout(done.bind(this, null, previousResult), time || 0);
}

function runTasks(tasks, previousResult, callback) {
    if(tasks.length) {
        tasks.shift()(previousResult, function(error, result) {
            if(error) {
                return callback(error);
            } else {
                if(tasks.length === 0) {
                    callback(null, result);
                } else {
                    runTasks(tasks, result, callback);
                }
            }
        });
    }
}

function driveUi(){
    var tasks = [];

    var driverFunctions = {
        navigate: function(location){
            tasks.push(executeNavigate.bind(driverFunctions, location));
            return driverFunctions;
        },
        findUi: function(value, type){
            tasks.push(executeFindUi.bind(driverFunctions, value, type));

            return driverFunctions;
        },
        focus: function(value, type) {
            tasks.push(executeFocus.bind(driverFunctions, value, type));

            return driverFunctions;
        },
        click: function(value, type){
            tasks.push(executeClick.bind(driverFunctions, value, type));

            return driverFunctions;
        },
        keyPress: function(value) {
            tasks.push(executeKeyPress.bind(driverFunctions, value));

            return driverFunctions;
        },
        setValue: function(value) {
            tasks.push(executeSetValue.bind(driverFunctions, value));

            return driverFunctions;
        },
        wait: function(time) {
            tasks.push(executeWait.bind(driverFunctions, time));

            return driverFunctions;
        },
        go: function(callback) {
            if(tasks.length) {
                runTasks(tasks, null, callback);
            } else {
                callback(new Error('No tasks defined'));
            }
        },
        do: function(driver){
            tasks.push(driver.go);
            return driverFunctions;
        }
    };

    return driverFunctions;
}


module.exports = driveUi;
