/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define: false, describe: false, it: false, expect: false, beforeEach: false, afterEach: false, waitsFor: false, runs: false, $: false */

define(function (require, exports, module) {
    'use strict';
    
    var Editor          = require("editor/Editor").Editor,
        EditorManager   = require("editor/EditorManager"),
        SpecRunnerUtils = require("spec/SpecRunnerUtils"),
        LanguageManager = require("language/LanguageManager");
    
    var langNames = {
        css:        {mode: "css",           langName: "CSS"},
        javascript: {mode: "javascript",    langName: "JavaScript"},
        html:       {mode: "html",          langName: "HTML"},
        unknown:    {mode: null,            langName: "Text"}
    };
    
    function compareMode(expected, actual) {
        if (typeof actual === "string") {
            return actual === expected;
        } else if (actual === null) {
            return expected === null;
        }
        
        return actual === expected;
    }
    
    function expectModeAndLang(editor, lang) {
        expect(editor.getModeForSelection()).toSpecifyModeNamed(lang.mode);
        expect(editor.getLanguageForSelection().getName()).toBe(lang.langName);
    }

    describe("Editor", function () {
        var defaultContent = "Brackets is going to be awesome!\n";
        var myDocument, myEditor;
        
        function createTestEditor(content, languageId) {
            // create dummy Document and Editor
            var mocks = SpecRunnerUtils.createMockEditor(content, languageId);
            myDocument = mocks.doc;
            myEditor = mocks.editor;
        }
        
        beforeEach(function () {
            this.addMatchers({
                toSpecifyModeNamed: function (expected) {
                    return compareMode(expected, this.actual);
                }
            });
        });

        afterEach(function () {
            if (myEditor) {
                SpecRunnerUtils.destroyMockEditor(myDocument);
                myEditor = null;
                myDocument = null;
            }
        });

        describe("Editor wrapper", function () {
            beforeEach(function () {
                createTestEditor(defaultContent, "");
            });
            
            it("should initialize with content", function () {
                // verify editor content
                expect(myEditor._codeMirror.getValue()).toEqual(defaultContent);
            });
            
            // FUTURE: this should really be in a Document unit test, but there's no "official"
            // way to create the model for a Document without manually creating an Editor, so we're
            // testing this here for now until we get a real central model.
            it("should trigger a synchronous Document change event when an edit is performed", function () {
                var changeFired = false;
                function changeHandler(event, doc, changeList) {
                    $(myDocument).off("change", changeHandler);
                    changeFired = true;
                    expect(doc).toBe(myDocument);
                    expect(changeList.from).toEqual({line: 0, ch: 0});
                    expect(changeList.to).toEqual({line: 1, ch: 0});
                    expect(changeList.text).toEqual(["new content"]);
                    expect(changeList.next).toBe(undefined);
                }
                $(myDocument).on("change", changeHandler);
                myEditor._codeMirror.setValue("new content");
                expect(changeFired).toBe(true);
            });
            
            it("should set mode based on Document language", function () {
                createTestEditor(defaultContent, "html");
                
                var htmlLanguage = LanguageManager.getLanguage("html");
                expect(myEditor.getModeForDocument()).toBe(htmlLanguage.getMode());
            });
            
        });
        
        describe("Focus", function () {
            beforeEach(function () {
                createTestEditor(defaultContent, "");
            });
            
            it("should not have focus until explicitly set", function () {
                expect(myEditor.hasFocus()).toBe(false);
            });
            
            it("should be able to detect when it has focus", function () {
                myEditor.focus();
                expect(myEditor.hasFocus()).toBe(true);
            });
        });
        
        describe("getModeForSelection()", function () {
            var jsContent = "var foo;";
            var htmlContent = "<html><head>\n" +
                              "  <script>\n" +
                              "    var bar;\n" +
                              "  </script>\n" +
                              "</head><body>\n" +
                              "  <p>Hello</p>\n" +
                              "</body></html>";
            
            it("should get mode in homogeneous file", function () {
                createTestEditor(jsContent, langNames.javascript.mode);
                
                // Mode at point
                myEditor.setCursorPos(0, 0);    // first char in text
                expectModeAndLang(myEditor, langNames.javascript);
                myEditor.setCursorPos(0, 8);    // last char in text
                expectModeAndLang(myEditor, langNames.javascript);
                
                myEditor.setCursorPos(0, 3);    // middle of text
                expectModeAndLang(myEditor, langNames.javascript);
                
                // Mode for range
                myEditor.setSelection({line: 0, ch: 4}, {line: 0, ch: 7});
                expectModeAndLang(myEditor, langNames.javascript);
                myEditor.setSelection({line: 0, ch: 0}, {line: 0, ch: 8});  // select all
                expectModeAndLang(myEditor, langNames.javascript);
                
                // Mode for multiple cursors/selections
                myEditor.setSelections([{start: {line: 0, ch: 0}, end: {line: 0, ch: 0}},
                                        {start: {line: 0, ch: 5}, end: {line: 0, ch: 5}}]);
                expectModeAndLang(myEditor, langNames.javascript);
                myEditor.setSelections([{start: {line: 0, ch: 0}, end: {line: 0, ch: 3}},
                                        {start: {line: 0, ch: 5}, end: {line: 0, ch: 7}}]);
                expectModeAndLang(myEditor, langNames.javascript);
            });
            
            it("should get mode in HTML file", function () {
                createTestEditor(htmlContent, "html");
                
                // Mode at point
                myEditor.setCursorPos(0, 0);    // first char in text
                expectModeAndLang(myEditor, langNames.html);
                myEditor.setCursorPos(6, 14);    // last char in text
                expectModeAndLang(myEditor, langNames.html);
                
                myEditor.setCursorPos(5, 7);    // middle of text - html
                expectModeAndLang(myEditor, langNames.html);
                myEditor.setCursorPos(2, 7);    // middle of text - js
                expectModeAndLang(myEditor, langNames.javascript);
                
                // Mode for range - homogeneous mode
                myEditor.setSelection({line: 5, ch: 2}, {line: 5, ch: 14});
                expectModeAndLang(myEditor, langNames.html);
                myEditor.setSelection({line: 5, ch: 0}, {line: 6, ch: 0});  // whole line
                expectModeAndLang(myEditor, langNames.html);
                myEditor.setSelection({line: 2, ch: 4}, {line: 2, ch: 12});
                expectModeAndLang(myEditor, langNames.javascript);
                myEditor.setSelection({line: 2, ch: 0}, {line: 3, ch: 0});  // whole line
                expectModeAndLang(myEditor, langNames.javascript);
                
                // Mode for multiple cursors/selections - homogeneous mode
                myEditor.setSelections([{start: {line: 2, ch: 0}, end: {line: 2, ch: 0}},
                                        {start: {line: 2, ch: 4}, end: {line: 2, ch: 4}}]);
                expectModeAndLang(myEditor, langNames.javascript);
                myEditor.setSelections([{start: {line: 2, ch: 0}, end: {line: 2, ch: 2}},
                                        {start: {line: 2, ch: 4}, end: {line: 2, ch: 6}}]);
                expectModeAndLang(myEditor, langNames.javascript);
                myEditor.setSelections([{start: {line: 0, ch: 0}, end: {line: 0, ch: 0}},
                                        {start: {line: 5, ch: 7}, end: {line: 5, ch: 7}},
                                        {start: {line: 6, ch: 14}, end: {line: 6, ch: 14}}]);
                expectModeAndLang(myEditor, langNames.html);
                myEditor.setSelections([{start: {line: 0, ch: 0}, end: {line: 0, ch: 2}},
                                        {start: {line: 5, ch: 7}, end: {line: 5, ch: 9}},
                                        {start: {line: 6, ch: 12}, end: {line: 6, ch: 14}}]);
                expectModeAndLang(myEditor, langNames.html);
                
                // Mode for range - mix of modes
                myEditor.setSelection({line: 2, ch: 4}, {line: 3, ch: 7});
                expectModeAndLang(myEditor, langNames.unknown);
                
                // Mode for multiple cursors/selections - mix of modes
                myEditor.setSelections([{start: {line: 0, ch: 0}, end: {line: 0, ch: 0}},
                                        {start: {line: 2, ch: 4}, end: {line: 2, ch: 4}},
                                        {start: {line: 6, ch: 14}, end: {line: 6, ch: 14}}]);
                expectModeAndLang(myEditor, langNames.unknown);
                myEditor.setSelections([{start: {line: 0, ch: 0}, end: {line: 0, ch: 2}},
                                        {start: {line: 2, ch: 4}, end: {line: 2, ch: 7}},
                                        {start: {line: 6, ch: 12}, end: {line: 6, ch: 14}}]);
                expectModeAndLang(myEditor, langNames.unknown);
                myEditor.setSelections([{start: {line: 0, ch: 0}, end: {line: 2, ch: 0}},
                                        {start: {line: 2, ch: 4}, end: {line: 2, ch: 7}},
                                        {start: {line: 6, ch: 12}, end: {line: 6, ch: 14}}]);
                expectModeAndLang(myEditor, langNames.unknown);
                myEditor.setSelections([{start: {line: 0, ch: 0}, end: {line: 0, ch: 2}},
                                        {start: {line: 2, ch: 4}, end: {line: 5, ch: 3}},
                                        {start: {line: 6, ch: 12}, end: {line: 6, ch: 14}}]);
                expectModeAndLang(myEditor, langNames.unknown);
                
                // Mode for range - mix of modes where start & endpoints are same mode
                // Known limitation of getModeForSelection() that it does not spot where the mode
                // differs in mid-selection
                myEditor.setSelection({line: 0, ch: 0}, {line: 6, ch: 14});  // select all
                expectModeAndLang(myEditor, langNames.html);
            });
            
        });
        
        describe("Column/ch conversion", function () {
            it("should get mode in HTML file", function () {
                var content =
                    "foo () {\n" +
                    "    one;\n" +
                    "\ttwo;\n" +
                    "}\n" +
                    "\n" +
                    "\tA\tB";
                createTestEditor(content, "javascript");
                
                // Tab size 4
                
                expect(myEditor.getColOffset({line: 1, ch: 0})).toBe(0);
                expect(myEditor.getColOffset({line: 1, ch: 1})).toBe(1);
                expect(myEditor.getColOffset({line: 1, ch: 2})).toBe(2);
                expect(myEditor.getColOffset({line: 1, ch: 3})).toBe(3);
                expect(myEditor.getColOffset({line: 1, ch: 4})).toBe(4);
                expect(myEditor.getColOffset({line: 1, ch: 5})).toBe(5);
                expect(myEditor.getColOffset({line: 2, ch: 0})).toBe(0);
                expect(myEditor.getColOffset({line: 2, ch: 1})).toBe(4);
                expect(myEditor.getColOffset({line: 2, ch: 2})).toBe(5);
                expect(myEditor.getColOffset({line: 4, ch: 0})).toBe(0);
                expect(myEditor.getColOffset({line: 5, ch: 1})).toBe(4);
                expect(myEditor.getColOffset({line: 5, ch: 2})).toBe(5);
                expect(myEditor.getColOffset({line: 5, ch: 3})).toBe(8);
                expect(myEditor.getColOffset({line: 5, ch: 4})).toBe(9);
                
                // Tab size 2
                Editor.setTabSize(2);
                
                expect(myEditor.getColOffset({line: 1, ch: 0})).toBe(0);  // first line is all spaces: should be unchanged
                expect(myEditor.getColOffset({line: 1, ch: 1})).toBe(1);
                expect(myEditor.getColOffset({line: 1, ch: 2})).toBe(2);
                expect(myEditor.getColOffset({line: 1, ch: 3})).toBe(3);
                expect(myEditor.getColOffset({line: 1, ch: 4})).toBe(4);
                expect(myEditor.getColOffset({line: 1, ch: 5})).toBe(5);
                expect(myEditor.getColOffset({line: 2, ch: 0})).toBe(0);  // but line with a tab shows different behavior
                expect(myEditor.getColOffset({line: 2, ch: 1})).toBe(2);
                expect(myEditor.getColOffset({line: 2, ch: 2})).toBe(3);
                expect(myEditor.getColOffset({line: 4, ch: 0})).toBe(0);
                expect(myEditor.getColOffset({line: 5, ch: 1})).toBe(2);  // same here
                expect(myEditor.getColOffset({line: 5, ch: 2})).toBe(3);
                expect(myEditor.getColOffset({line: 5, ch: 3})).toBe(4);
                expect(myEditor.getColOffset({line: 5, ch: 4})).toBe(5);
                
                // Restore default
                Editor.setTabSize(4);
            });
        });
        
        describe("Selections", function () {
            
            beforeEach(function () {
                createTestEditor("this is line 1\nthis is line 2\nthis is line 3\nthis is line 4\nthis is line 5", "unknown");
            });
                
            describe("hasSelection", function () {
                it("should return false for a single cursor", function () {
                    myEditor._codeMirror.setCursor(0, 2);
                    expect(myEditor.hasSelection()).toBe(false);
                });
                
                it("should return true for a single selection", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 1}, {line: 0, ch: 5});
                    expect(myEditor.hasSelection()).toBe(true);
                });
                
                it("should return false for multiple cursors", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ]);
                    expect(myEditor.hasSelection()).toBe(false);
                });
                
                it("should return true for multiple selections", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ]);
                    expect(myEditor.hasSelection()).toBe(true);
                });
                
                it("should return true for mixed cursors and selections", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ]);
                    expect(myEditor.hasSelection()).toBe(true);
                });
            });
            
            describe("getCursorPos", function () {
                it("should return a single cursor", function () {
                    myEditor._codeMirror.setCursor(0, 2);
                    expect(myEditor.getCursorPos()).toEqual({line: 0, ch: 2});
                    expect(myEditor.getCursorPos(false, "start")).toEqual({line: 0, ch: 2});
                    expect(myEditor.getCursorPos(false, "anchor")).toEqual({line: 0, ch: 2});
                    expect(myEditor.getCursorPos(false, "end")).toEqual({line: 0, ch: 2});
                    expect(myEditor.getCursorPos(false, "head")).toEqual({line: 0, ch: 2});
                });
                
                it("should return the correct ends of a single selection", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 1}, {line: 0, ch: 5});
                    expect(myEditor.getCursorPos()).toEqual({line: 0, ch: 5});
                    expect(myEditor.getCursorPos(false, "start")).toEqual({line: 0, ch: 1});
                    expect(myEditor.getCursorPos(false, "anchor")).toEqual({line: 0, ch: 1});
                    expect(myEditor.getCursorPos(false, "end")).toEqual({line: 0, ch: 5});
                    expect(myEditor.getCursorPos(false, "head")).toEqual({line: 0, ch: 5});
                });
                
                it("should return the default primary cursor in a multiple cursor selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ]);
                    expect(myEditor.getCursorPos()).toEqual({line: 2, ch: 1});
                    expect(myEditor.getCursorPos(false, "start")).toEqual({line: 2, ch: 1});
                    expect(myEditor.getCursorPos(false, "anchor")).toEqual({line: 2, ch: 1});
                    expect(myEditor.getCursorPos(false, "end")).toEqual({line: 2, ch: 1});
                    expect(myEditor.getCursorPos(false, "head")).toEqual({line: 2, ch: 1});
                });
                
                it("should return the specific primary cursor in a multiple cursor selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ], 1);
                    expect(myEditor.getCursorPos()).toEqual({line: 1, ch: 1});
                    expect(myEditor.getCursorPos(false, "start")).toEqual({line: 1, ch: 1});
                    expect(myEditor.getCursorPos(false, "anchor")).toEqual({line: 1, ch: 1});
                    expect(myEditor.getCursorPos(false, "end")).toEqual({line: 1, ch: 1});
                    expect(myEditor.getCursorPos(false, "head")).toEqual({line: 1, ch: 1});
                });
                
                it("should return the correct ends of the default primary selection in a multiple selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ]);
                    expect(myEditor.getCursorPos()).toEqual({line: 2, ch: 4});
                    expect(myEditor.getCursorPos(false, "start")).toEqual({line: 2, ch: 1});
                    expect(myEditor.getCursorPos(false, "anchor")).toEqual({line: 2, ch: 1});
                    expect(myEditor.getCursorPos(false, "end")).toEqual({line: 2, ch: 4});
                    expect(myEditor.getCursorPos(false, "head")).toEqual({line: 2, ch: 4});
                });
                
                it("should return the correct ends of a specific primary selection in a multiple selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ], 1);
                    expect(myEditor.getCursorPos()).toEqual({line: 1, ch: 4});
                    expect(myEditor.getCursorPos(false, "start")).toEqual({line: 1, ch: 1});
                    expect(myEditor.getCursorPos(false, "anchor")).toEqual({line: 1, ch: 1});
                    expect(myEditor.getCursorPos(false, "end")).toEqual({line: 1, ch: 4});
                    expect(myEditor.getCursorPos(false, "head")).toEqual({line: 1, ch: 4});
                });
            });
            
            describe("setCursorPos", function () {
                it("should replace an existing single cursor", function () {
                    myEditor._codeMirror.setCursor(0, 2);
                    myEditor.setCursorPos(1, 3);
                    expect(myEditor.getCursorPos()).toEqual({line: 1, ch: 3});
                });

                it("should replace an existing single selection", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 1}, {line: 0, ch: 5});
                    myEditor.setCursorPos(1, 3);
                    expect(myEditor.getCursorPos()).toEqual({line: 1, ch: 3});
                });
                
                it("should replace existing multiple cursors", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ]);
                    myEditor.setCursorPos(1, 3);
                    expect(myEditor.getCursorPos()).toEqual({line: 1, ch: 3});
                });
                
                it("should replace existing multiple selections", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ]);
                    myEditor.setCursorPos(1, 3);
                    expect(myEditor.getCursorPos()).toEqual({line: 1, ch: 3});
                });
            });
            
            describe("getSelection", function () {
                it("should return a single cursor", function () {
                    myEditor._codeMirror.setCursor(0, 2);
                    expect(myEditor.getSelection()).toEqual({start: {line: 0, ch: 2}, end: {line: 0, ch: 2}, reversed: false});
                });
                
                it("should return a single selection", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 1}, {line: 0, ch: 5});
                    expect(myEditor.getSelection()).toEqual({start: {line: 0, ch: 1}, end: {line: 0, ch: 5}, reversed: false});
                });

                it("should return a multiline selection", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 5}, {line: 1, ch: 3});
                    expect(myEditor.getSelection()).toEqual({start: {line: 0, ch: 5}, end: {line: 1, ch: 3}, reversed: false});
                });

                it("should return a single selection in the proper order when reversed", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 5}, {line: 0, ch: 1});
                    expect(myEditor.getSelection()).toEqual({start: {line: 0, ch: 1}, end: {line: 0, ch: 5}, reversed: true});
                });
                
                it("should return a multiline selection in the proper order when reversed", function () {
                    myEditor._codeMirror.setSelection({line: 1, ch: 3}, {line: 0, ch: 5});
                    expect(myEditor.getSelection()).toEqual({start: {line: 0, ch: 5}, end: {line: 1, ch: 3}, reversed: true});
                });
                
                it("should return the default primary cursor in a multiple cursor selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ]);
                    expect(myEditor.getSelection()).toEqual({start: {line: 2, ch: 1}, end: {line: 2, ch: 1}, reversed: false});
                });
                
                it("should return the specific primary cursor in a multiple cursor selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ], 1);
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 1}, end: {line: 1, ch: 1}, reversed: false});
                });
                
                it("should return the default primary selection in a multiple selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ]);
                    expect(myEditor.getSelection()).toEqual({start: {line: 2, ch: 1}, end: {line: 2, ch: 4}, reversed: false});
                });
                
                it("should return the default primary selection in the proper order when reversed", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 4}, head: {line: 2, ch: 1}}
                                                       ]);
                    expect(myEditor.getSelection()).toEqual({start: {line: 2, ch: 1}, end: {line: 2, ch: 4}, reversed: true});
                });
                
                it("should return the specific primary selection in a multiple selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ], 1);
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 1}, end: {line: 1, ch: 4}, reversed: false});
                });
                
                it("should return the specific primary selection in the proper order when reversed", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 4}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ], 1);
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 1}, end: {line: 1, ch: 4}, reversed: true});
                });

            });
            
            describe("getSelections", function () {
                it("should return a single cursor", function () {
                    myEditor._codeMirror.setCursor(0, 2);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 2}, end: {line: 0, ch: 2}, reversed: false, primary: true}]);
                });
                
                it("should return a single selection", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 1}, {line: 0, ch: 5});
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 0, ch: 5}, reversed: false, primary: true}]);
                });
                
                it("should properly reverse a single selection whose head is before its anchor", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 5}, {line: 0, ch: 1});
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 0, ch: 5}, reversed: true, primary: true}]);
                });
                
                it("should return multiple cursors", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 0, ch: 1}, reversed: false, primary: false},
                                                        {start: {line: 1, ch: 1}, end: {line: 1, ch: 1}, reversed: false, primary: false},
                                                        {start: {line: 2, ch: 1}, end: {line: 2, ch: 1}, reversed: false, primary: true}
                                                       ]);
                });
                
                it("should return a multiple selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 0, ch: 4}, reversed: false, primary: false},
                                                        {start: {line: 1, ch: 1}, end: {line: 1, ch: 4}, reversed: false, primary: false},
                                                        {start: {line: 2, ch: 1}, end: {line: 2, ch: 4}, reversed: false, primary: true}
                                                       ]);
                });
                
                it("should properly reverse selections whose heads are before their anchors in a multiple selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 4}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 4}, head: {line: 2, ch: 1}}
                                                       ]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 0, ch: 4}, reversed: true, primary: false},
                                                        {start: {line: 1, ch: 1}, end: {line: 1, ch: 4}, reversed: false, primary: false},
                                                        {start: {line: 2, ch: 1}, end: {line: 2, ch: 4}, reversed: true, primary: true}
                                                       ]);
                });
                
                it("should properly reverse multiline selections whose heads are before their anchors in a multiple selection", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 1, ch: 3}, head: {line: 0, ch: 5}},
                                                        {anchor: {line: 4, ch: 4}, head: {line: 3, ch: 1}}
                                                       ]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 5}, end: {line: 1, ch: 3}, reversed: true, primary: false},
                                                        {start: {line: 3, ch: 1}, end: {line: 4, ch: 4}, reversed: true, primary: true}
                                                       ]);
                });
            });
            
            describe("getSelectedText", function () {
                it("should return empty string for a cursor", function () {
                    myEditor._codeMirror.setCursor(0, 2);
                    expect(myEditor.getSelectedText()).toEqual("");
                });
                
                it("should return the contents of a single selection", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 8}, {line: 0, ch: 12});
                    expect(myEditor.getSelectedText()).toEqual("line");
                });
                
                it("should return the contents of a multiple selection, separated by newlines", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 8}, head: {line: 0, ch: 12}},
                                                        {anchor: {line: 1, ch: 8}, head: {line: 1, ch: 12}},
                                                        {anchor: {line: 2, ch: 8}, head: {line: 2, ch: 12}}
                                                       ]);
                    expect(myEditor.getSelectedText()).toEqual("line\nline\nline");
                });

                it("should return the contents of a multiple selection when some selections are reversed", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 12}, head: {line: 0, ch: 8}},
                                                        {anchor: {line: 1, ch: 8}, head: {line: 1, ch: 12}},
                                                        {anchor: {line: 2, ch: 12}, head: {line: 2, ch: 8}}
                                                       ]);
                    expect(myEditor.getSelectedText()).toEqual("line\nline\nline");
                });
            });
            
            describe("setSelection", function () {
                it("should replace an existing single cursor", function () {
                    myEditor._codeMirror.setCursor(0, 2);
                    myEditor.setSelection({line: 1, ch: 3}, {line: 2, ch: 5});
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 3}, end: {line: 2, ch: 5}, reversed: false});
                });

                it("should replace an existing single selection", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 1}, {line: 0, ch: 5});
                    myEditor.setSelection({line: 1, ch: 3}, {line: 2, ch: 5});
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 3}, end: {line: 2, ch: 5}, reversed: false});
                });
                
                it("should allow implicit end", function () {
                    myEditor.setSelection({line: 1, ch: 3});
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 3}, end: {line: 1, ch: 3}, reversed: false});
                });
                
                it("should replace existing multiple cursors", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ]);
                    myEditor.setSelection({line: 1, ch: 3}, {line: 2, ch: 5});
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 3}, end: {line: 2, ch: 5}, reversed: false});
                });
                
                it("should replace existing multiple selections", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ]);
                    myEditor.setSelection({line: 1, ch: 3}, {line: 2, ch: 5});
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 3}, end: {line: 2, ch: 5}, reversed: false});
                });
            });

            describe("setSelections", function () {
                it("should replace an existing single cursor", function () {
                    myEditor._codeMirror.setCursor(0, 2);
                    myEditor.setSelections([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}}]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}, reversed: false, primary: false},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false, primary: true}]);
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false});
                });

                it("should replace an existing single selection", function () {
                    myEditor._codeMirror.setSelection({line: 0, ch: 1}, {line: 0, ch: 5});
                    myEditor.setSelections([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}}]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}, reversed: false, primary: false},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false, primary: true}]);
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false});
                });
                
                it("should replace existing multiple cursors", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 1}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 1}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 1}}
                                                       ]);
                    myEditor.setSelections([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}}]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}, reversed: false, primary: false},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false, primary: true}]);
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false});
                });
                
                it("should replace existing multiple selections", function () {
                    myEditor._codeMirror.setSelections([{anchor: {line: 0, ch: 1}, head: {line: 0, ch: 4}},
                                                        {anchor: {line: 1, ch: 1}, head: {line: 1, ch: 4}},
                                                        {anchor: {line: 2, ch: 1}, head: {line: 2, ch: 4}}
                                                       ]);
                    myEditor.setSelections([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}}]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}, reversed: false, primary: false},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false, primary: true}]);
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false});
                });
                
                it("should specify non-default primary selection", function () {
                    myEditor.setSelections([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}, primary: true},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}}]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}, reversed: false, primary: true},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false, primary: false}]);
                    expect(myEditor.getSelection()).toEqual({start: {line: 0, ch: 1}, end: {line: 1, ch: 3}, reversed: false});
                });
                
                it("should sort and merge overlapping selections", function () {
                    myEditor.setSelections([{start: {line: 2, ch: 4}, end: {line: 3, ch: 0}},
                                            {start: {line: 2, ch: 3}, end: {line: 2, ch: 6}},
                                            {start: {line: 1, ch: 1}, end: {line: 1, ch: 4}}]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 1, ch: 1}, end: {line: 1, ch: 4}, reversed: false, primary: true},
                                            {start: {line: 2, ch: 3}, end: {line: 3, ch: 0}, reversed: false, primary: false}]);
                    expect(myEditor.getSelection()).toEqual({start: {line: 1, ch: 1}, end: {line: 1, ch: 4}, reversed: false});
                });

                it("should properly set reversed selections", function () {
                    myEditor.setSelections([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}, reversed: true},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}}]);
                    expect(myEditor.getSelections()).toEqual([{start: {line: 0, ch: 1}, end: {line: 1, ch: 3}, reversed: true, primary: false},
                                            {start: {line: 1, ch: 8}, end: {line: 2, ch: 5}, reversed: false, primary: true}]);
                    
                });
            });
        });
    });
});
