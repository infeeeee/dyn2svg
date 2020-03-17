# dyn2svg

Node module for generating svg preview for [Dynamo](https://dynamobim.org/) 2.x .dyn files.

Absolutely not finished, mostly working.

This is just the module, for a working application see [dynConvert](https://github.com/infeeeee/dynConvert)

## Install

```
npm install infeeeee/dyn2svg
```

## Usage

### Browser

TODO

### Nodejs

``` javascript
const fs = require('fs')
require('dyn2svg')

fs.readFileSync("path/to/graph.dyn", "utf-8")
    .dyn2svg()
    .then((res) => {
        fs.writeFile("path/to/graph.dyn.svg", res, (err) => {
            if (err) throw err;
            console.log('File converted!');
        })
    })
```

## TODO

- [ ] fix codeblock display
- [ ] color codeblock text
- [ ] copy all parameters from dyn to svg (so it's possible to convert back from svg to dyn)
- [ ] fix special nodes (T/F, String, Slider, etc...)
- [ ] groups' alpha
- [ ] create browser example
- [ ] finish offline viewer/converter
- [ ] show python code someway
- [ ] support dyf files
- [ ] show dyf files in dyn
- [ ] check more nodes' display

## License

MIT