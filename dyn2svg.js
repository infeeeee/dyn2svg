/* -------------------------------------------------------------------------- */
/*                                   Modules                                  */
/* -------------------------------------------------------------------------- */

// svg.js
const window = require('svgdom')
const SVG = require('svg.js')(window)
const document = window.document

// word wrap
const wrap = require('word-wrap');


/* -------------------------------------------------------------------------- */
/*                                    Code                                    */
/* -------------------------------------------------------------------------- */

function dyn2svg() {}

module.exports = dyn2svg


/**
 * Create svg from a dyn file
 * @returns promise
 */
String.prototype.dyn2svg = function () {
    return new Promise((resolve, reject) => {

        // let dynObj = hasJsonStructure(this) ? JSON.parse(this) : reject(new Error('Input file is not proper JSON!'))
        let dynObj = JSON.parse(this)

        /*
        1. Nodes:
            - Position: NodeViews
            - Width: From name -> NodeViews
            - Height: From Inputs and outputs -> Nodes
        */


        // create svg
        let element = document.createElement('svg');
        let canvas = SVG(element)

        // style
        const nodeStyle = {
            portBoxHeight: 25, // the height of ports on a node
            charWidth: 9, // the width of a character for guessing the widths of box, should be eliminated later
            border: 1, // the width of the borders of a node. Also used for some text positioning
            fontSize: 16, // font size of nodes and notes, groups
            viewMargin: 200, // margin around the whole graph
            wireEndSize: 5, // radius of the semidots on the end of wires

        }



        // vars for x and y extents
        let extents = {}

        /* ---------------------------- Looping on nodes ---------------------------- */

        for (let i = 0; i < dynObj.Nodes.length; i++) {
            const element = dynObj.Nodes[i];

            let nodeViewData = {}

            // finding corresponding nodeview data
            for (let j = 0; j < dynObj.View.NodeViews.length; j++) {
                if (dynObj.View.NodeViews[j].Id == element.Id) {
                    nodeViewData = dynObj.View.NodeViews[j]
                }
            }

            // calc the number of inputs and outputs
            let hBox
            if (element.Inputs.length > element.Outputs.length) {
                hBox = element.Inputs.length
            } else {
                hBox = element.Outputs.length
            }

            // calculate geometries
            let fullWidth = nodeViewData.Name.length * nodeStyle.charWidth
            let fullHeight = (hBox + 2) * nodeStyle.portBoxHeight

            // find the longest input name
            let lInput = 0
            for (let k = 0; k < element.Inputs.length; k++) {
                if (lInput < element.Inputs[k].Name.length) {
                    lInput = element.Inputs[k].Name.length
                }
            }

            let inputWidth = lInput * nodeStyle.charWidth

            // find the longest output name
            let lOutput = 0
            for (let k = 0; k < element.Outputs.length; k++) {
                if (lOutput < element.Outputs[k].Name.length) {
                    lOutput = element.Outputs[k].Name.length
                }
            }

            let outputWidth = lOutput * nodeStyle.charWidth

            //find codeblock width
            let lCodeblock = 0
            if (element.NodeType == "CodeBlockNode") {

                // find longest code line
                let codeArr = element.Code.split("\n")
                for (let j = 0; j < codeArr.length; j++) {
                    if (codeArr[j].length > lCodeblock) {
                        lCodeblock = codeArr[j].length
                    }
                }
            }

            let codeblockWidth = lCodeblock * nodeStyle.charWidth * 1.2 + 4

            // longer fullwidth if inputs and outputs are too long
            if (inputWidth + outputWidth + codeblockWidth > fullWidth + 2) {
                fullWidth = inputWidth + outputWidth + codeblockWidth + 4
            }


            /* -------------------------- background and header ------------------------- */

            // create svg group
            let nodeGroup = canvas.group().attr("id", element.Id).move(nodeViewData.X, nodeViewData.Y)

            // basic background box
            canvas.rect(fullWidth, fullHeight)
                .attr({
                    fill: "#cbc6be",
                    stroke: "#5e5c5a",
                    "stroke-width": nodeStyle.border
                })
                .addClass("backgroundBox")
                .addTo(nodeGroup)

            // header box
            canvas.rect(fullWidth, nodeStyle.portBoxHeight)
                .attr({
                    fill: "#5e5c5a",
                    stroke: "#5e5c5a",
                    "stroke-width": nodeStyle.border
                })
                .addClass("headerBox")
                .addTo(nodeGroup)

            // title
            canvas.text(nodeViewData.Name)
                .attr({
                    "font-size": nodeStyle.fontSize,
                    "font-weight": "bold",
                    fill: "#fff",
                    "dominant-baseline": "middle",
                    "text-anchor": "middle"
                })
                .addClass("headerText")
                .addTo(nodeGroup).move(fullWidth / 2, nodeStyle.border)



            // starting extents, can't start from 0
            if (!extents.xMax) {
                extents.xMax = nodeViewData.X + fullWidth
                extents.xMin = nodeViewData.X
                extents.yMax = nodeViewData.Y + fullHeight
                extents.yMin = nodeViewData.Y
            }

            // x and y extents
            if (extents.xMax < nodeViewData.X + fullWidth) {
                extents.xMax = nodeViewData.X + fullWidth
            }
            if (extents.xMin > nodeViewData.X) {
                extents.xMin = nodeViewData.X
            }
            if (extents.yMax < nodeViewData.Y + fullHeight) {
                extents.yMax = nodeViewData.Y + fullHeight
            }
            if (extents.yMin > nodeViewData.Y) {
                extents.yMin = nodeViewData.Y
            }


            /* ---------------------------------- Ports --------------------------------- */

            // create groups
            let inputGroup = canvas.group().move(nodeStyle.border / 2, nodeStyle.portBoxHeight + nodeStyle.border / 2).addTo(nodeGroup)
            let outputGroup = canvas.group().move(fullWidth - outputWidth - nodeStyle.border / 2, nodeStyle.portBoxHeight + nodeStyle.border / 2).addTo(nodeGroup)



            // create inputs
            for (let k = 0; k < element.Inputs.length; k++) {
                let inputButtons = createPorts(element.Inputs[k], canvas, nodeStyle, inputWidth)
                inputButtons
                    .move(0, k * nodeStyle.portBoxHeight)
                    .addClass("inputGroup")
                    .addTo(inputGroup)
            }

            // create outputs
            for (let k = 0; k < element.Outputs.length; k++) {
                let outputButtons = createPorts(element.Outputs[k], canvas, nodeStyle, outputWidth)
                outputButtons
                    .move(0, k * nodeStyle.portBoxHeight)
                    .addClass("outputGroup")
                    .addTo(outputGroup)
            }

            // resize port boxes based on bbox width
            let inputWidthBbox = 0
            let outputWidthBbox = 0

            // calculate max input and output bbox widths
            nodeGroup.each(function () {
                if (this.hasClass("portGroup")) {
                    this.each(function () {
                        if (this.hasClass("portText")) {
                            if (this.parent().hasClass("inputGroup")) {
                                if (this.bbox().width > inputWidthBbox) {
                                    inputWidthBbox = this.bbox().width
                                }
                            } else if (this.parent().hasClass("outputGroup")) {
                                if (this.bbox().width > outputWidthBbox) {
                                    outputWidthBbox = this.bbox().width
                                }
                            }
                        }
                    })
                }
            }, true)

            // add some padding
            inputWidthBbox = inputWidthBbox + nodeStyle.charWidth
            outputWidthBbox = outputWidthBbox + nodeStyle.charWidth

            // assign new port widths
            nodeGroup.each(function () {
                if (this.hasClass("portGroup")) {
                    this.each(function () {
                        if (this.parent().hasClass("inputGroup") && this.hasClass("portRect")) {
                            this.attr('width', inputWidthBbox)
                        } else if (this.parent().hasClass("outputGroup") && this.hasClass("portRect")) {
                            this.attr('width', outputWidthBbox)
                        }
                    })
                }
            }, true)

            //move output group
            outputGroup.move(fullWidth - outputWidthBbox - nodeStyle.border / 2, nodeStyle.portBoxHeight + nodeStyle.border / 2)

            /* -------------------------------- Codeblock ------------------------------- */

            if (element.NodeType == "CodeBlockNode") {

                // NOT FINISHED!!!

                let codeblockGroup = canvas.group().addTo(nodeGroup).move(inputWidthBbox + 2, nodeStyle.portBoxHeight + nodeStyle.border / 2)


                let codeblockText = canvas.text(element.Code)
                    .attr({
                        "font-size": nodeStyle.fontSize,
                        fill: "#555",
                        "dominant-baseline": "baseline",
                        "text-anchor": "start",
                        "font-family": "monospace"
                    })

                    .addClass("codeblockText")
                    .move(0, nodeStyle.border)
                    .addTo(codeblockGroup)


                let codeblockBboxWidth = fullWidth - outputWidthBbox - inputWidthBbox - 4

                canvas.rect(codeblockBboxWidth, codeblockText.bbox().height).attr({
                        fill: "#e5e2de",
                        stroke: "none",
                    })
                    .addClass("codeblockRect")
                    .addTo(codeblockGroup)
                    .after(codeblockText)
            }

        }

        /* ---------------------------------- Wires --------------------------------- */

        for (let i = 0; i < dynObj.Connectors.length; i++) {
            let startId = dynObj.Connectors[i].Start
            let endId = dynObj.Connectors[i].End

            let coords = {}
            coords.start = {}
            coords.end = {}

            // create group
            let wireGroup = canvas.group().attr({
                id: dynObj.Connectors[i].Id
            })

            // calculate coordinates
            canvas.each(function () {
                if (this.attr("id") == startId) {
                    coords.start.x = this.parent().parent().x() + this.parent().parent().get(0).bbox().width + nodeStyle.border / 2
                    coords.start.y = this.parent().parent().y() + (this.parent().index(this) + 1.5) * nodeStyle.portBoxHeight
                } else if (this.attr("id") == endId) {
                    coords.end.x = this.parent().parent().x() - nodeStyle.border / 2
                    coords.end.y = this.parent().parent().y() + (this.parent().index(this) + 1.5) * nodeStyle.portBoxHeight
                }
            }, true)

            // create line for bezier calc
            let measureLine = canvas.path("M" + coords.start.x + " " + coords.start.y + " L" + coords.end.x + " " + coords.end.y)
            let bezierLength = measureLine.length() * 0.5
            measureLine.remove()

            coords.start.x1 = coords.start.x + bezierLength
            coords.end.x1 = coords.end.x - bezierLength

            // create path
            canvas.path("M " + coords.start.x + "," + coords.start.y + " C " + coords.start.x1 + "," + coords.start.y + " " + coords.end.x1 + "," + coords.end.y + " " + coords.end.x + "," + coords.end.y)
                .attr({
                    fill: "none",
                    "stroke-width": 4,
                    stroke: "#444"
                })
                .addClass("wire")
                .addTo(wireGroup)


            // create start point
            canvas.path(createWireEnd(coords, true, nodeStyle))
                .attr({
                    fill: "#444",
                    stroke: "none"
                })
                .addTo(wireGroup)

            // Create end point
            canvas.path(createWireEnd(coords, false, nodeStyle))
                .attr({
                    fill: "#444",
                    stroke: "none"
                })
                .addTo(wireGroup)
        }




        /* -------------------------- Groups and text notes ------------------------- */

        for (let i = 0; i < dynObj.View.Annotations.length; i++) {
            let element = dynObj.View.Annotations[i]

            // create group
            let annotationGroup = canvas.group().attr({
                    id: element.Id
                })
                .move(element.Left, element.Top)
                .back()


            //Check if note or group
            if (element.Nodes.length > 0) {

                // it's a group

                // calculate color, it seems dyn file stores them as #AARRGGBB
                let groupColor = element.Background.match(/#(..)(..)(..)(..)/)


                // create rect
                canvas.rect(element.Width, element.Height).attr({
                        fill: "#" + groupColor[2] + groupColor[3] + groupColor[4],
                        "fill-opacity": (parseInt(groupColor[1], 16) / 255),
                        stroke: "none",
                    })
                    .addClass("annotationRect")
                    .addTo(annotationGroup)



                // wrap text
                let textLength = Math.floor(parseFloat(element.Width) / (nodeStyle.charWidth * 0.8))
                let wrappedTitle = wrap(element.Title, {
                    width: textLength,
                    indent: ""
                })

                // create text
                canvas.text(wrappedTitle)
                    .attr({
                        "font-size": nodeStyle.fontSize,
                        fill: "#000",
                        "dominant-baseline": "baseline",
                        "text-anchor": "start"
                    })
                    .addClass("annotationText")
                    .addTo(annotationGroup).move(nodeStyle.border, nodeStyle.border)

                // move nodes to groups
                for (let j = 0; j < element.Nodes.length; j++) {
                    canvas.select("#" + element.Nodes[j]).toParent(annotationGroup)
                }

                // add class to group
                annotationGroup.addClass("groupGroup")

            } else {
                // it's note

                // wrap text
                let wrappedTitle = wrap(element.Title, {
                    width: 55,
                    indent: ""
                })

                // create text
                let noteText = canvas.text(wrappedTitle)
                    .attr({
                        "font-size": nodeStyle.fontSize,
                        fill: "#000",
                        "dominant-baseline": "baseline",
                        "text-anchor": "start"
                    })
                    .addClass("annotationText")
                    .addTo(annotationGroup).move(nodeStyle.border + nodeStyle.portBoxHeight * 0.5, nodeStyle.border + nodeStyle.portBoxHeight * 0.5)

                // create background
                canvas.rect(noteText.bbox().width + nodeStyle.portBoxHeight, noteText.bbox().height + nodeStyle.portBoxHeight).attr({
                        fill: "#eee",
                        stroke: "none",
                    })
                    .addClass("annotationRect")
                    .addTo(annotationGroup)
                    .after(noteText)

                // modify the root group of this note
                annotationGroup
                    .dmove(nodeStyle.portBoxHeight * -0.5, nodeStyle.portBoxHeight * -0.5)
                    .addClass("noteGroup")
            }
        }


        // check for intersecting groups
        canvas.select(".groupGroup").each(function () {
            let currentInner = {
                x: this.rbox().cx,
                y: this.rbox().cy,
                id: this.attr("id")
            }
            let that = this

            canvas.select(".groupGroup").each(function () {
                let checkRect = canvas.rect(this.rbox().w, this.rbox().h).move(this.rbox().x, this.rbox().y).fill("#00f")
                let inside = checkRect.inside(currentInner.x, currentInner.y)
                checkRect.remove()

                if (inside && currentInner.id != this.attr("id")) {
                    this.after(that)
                    // that.front()
                } 
            })
        })

        /* --------------------------------- Extents -------------------------------- */

        // extents calculations
        let cx = extents.xMax - extents.xMin + nodeStyle.viewMargin
        let cy = extents.yMax - extents.yMin + nodeStyle.viewMargin
        let cxMin = extents.xMin - nodeStyle.viewMargin / 2
        let cyMin = extents.yMin - nodeStyle.viewMargin / 2

        // canvas viewbox
        canvas.attr({
            width: cx,
            height: cy,
            viewBox: cxMin + " " + cyMin + " " + cx + " " + cy
        })

        resolve(canvas.svg())
    })
}


function createPorts(input, canvas, style, boxWidth) {

    // create input group
    let inputGroup = canvas.group()
        .attr({
            id: input.Id
        })
        .addClass("portGroup")

    // create input box
    canvas.rect(boxWidth, style.portBoxHeight - 1)
        .attr({
            fill: "#e5e2de",
        })
        .addClass("portRect")
        .addTo(inputGroup)

    // create port text
    canvas.text(input.Name || ">")
        .attr({
            "font-size": style.fontSize,
            fill: "#555",
            "dominant-baseline": "middle",
            "text-anchor": "start"
        })
        .addClass("portText")
        .addTo(inputGroup)
        .move(style.border + style.charWidth / 3, style.border)

    return inputGroup
}

function createWireEnd(coords, isStart, style) {
    let pCoords = {}
    if (isStart) {
        pCoords = {
            x: coords.start.x,
            y: coords.start.y - style.wireEndSize,
            flag: "0 1"
        }
    } else {
        pCoords = {
            x: coords.end.x,
            y: coords.end.y - style.wireEndSize,
            flag: "1 0"
        }
    }

    let outpath = "M " + pCoords.x + "," + pCoords.y + " a" + style.wireEndSize + " " + style.wireEndSize + " 0 " + pCoords.flag + " 0 " + (style.wireEndSize * 2) + " z"
    return outpath
}

function hasJsonStructure(str) {
    if (typeof str !== 'string') return false;
    try {
        const result = JSON.parse(str);
        const type = Object.prototype.toString.call(result);
        return type === '[object Object]' ||
            type === '[object Array]';
    } catch (err) {
        return false;
    }
}