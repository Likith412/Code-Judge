import Editor from "@monaco-editor/react";

import { LANG_LABEL, MONACO_LANG } from "../../utils/languages";

import "./index.css";

const CodeEditor = (props) => {
   const {
      languages,
      language,
      code,
      dirty,
      readOnly,
      onPickLanguage,
      onChange,
      onReset,
   } = props;

   return (
      <div className="editor">
         <div className="editor-bar">
            <select
               className="input editor-lang"
               value={language}
               onChange={(event) => onPickLanguage(event.target.value)}
               disabled={languages.length === 1}
            >
               {languages.map((one) => (
                  <option key={one} value={one}>
                     {LANG_LABEL[one] || one}
                  </option>
               ))}
            </select>

            {languages.length === 1 && (
               <span className="editor-note">
                  Only language for this problem
               </span>
            )}

            <span className="editor-spacer" />

            {dirty && <span className="editor-note">Edited</span>}

            <button
               type="button"
               className="btn btn-ghost editor-reset"
               onClick={onReset}
               disabled={!dirty || readOnly}
            >
               Reset to starter
            </button>
         </div>

         <div className="editor-surface">
            <Editor
               language={MONACO_LANG[language] || "plaintext"}
               value={code}
               onChange={(value) => onChange(value ?? "")}
               loading={<span className="editor-loading">Loading editor…</span>}
               options={{
                  readOnly,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  tabSize: 3,
                  automaticLayout: true,
               }}
            />
         </div>
      </div>
   );
};

export default CodeEditor;
