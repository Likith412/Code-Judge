import { useState } from "react";
import Markdown from "react-markdown";
import Editor from "@monaco-editor/react";

import { LANG_LABEL, MONACO_LANG } from "../../utils/languages";

import "./index.css";

const LANGUAGES = Object.keys(LANG_LABEL);
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
const COMPARISONS = [
   { value: "TRIM", label: "Trim" },
   { value: "EXACT", label: "Exact" },
];

// The same editor users type in, without the extras a short snippet needs.
const STARTER_OPTIONS = {
   minimap: { enabled: false },
   scrollBeyondLastLine: false,
   fontSize: 13,
   tabSize: 3,
   // Redraws when its tab is shown again after being hidden.
   automaticLayout: true,
};

const label = (word) => word.charAt(0) + word.slice(1).toLowerCase();

// Every field of a problem. The page owns the draft and saving it.
const ProblemForm = ({ draft, onChange, errors, isNew }) => {
   const [starterTab, setStarterTab] = useState(
      draft.supportedLanguages[0] || "java",
   );

   const set = onChange;

   const setListItem = (key, index, value) =>
      set({
         [key]: draft[key].map((item, at) => (at === index ? value : item)),
      });

   const removeListItem = (key, index) =>
      set({ [key]: draft[key].filter((_, at) => at !== index) });

   const toggleLanguage = (language) => {
      const has = draft.supportedLanguages.includes(language);
      const next = has
         ? draft.supportedLanguages.filter((one) => one !== language)
         : [...draft.supportedLanguages, language];

      // A problem always takes at least one language.
      if (next.length === 0) return;

      set({ supportedLanguages: next });
      if (!next.includes(starterTab)) setStarterTab(next[0]);
      if (!has) setStarterTab(language);
   };

   const renderSeg = (options, value, onPick) => (
      <div className="seg">
         {options.map((option) => (
            <button
               key={option.value}
               type="button"
               className={
                  option.value === value ? "seg-opt seg-opt-on" : "seg-opt"
               }
               onClick={() => onPick(option.value)}
            >
               {option.label}
            </button>
         ))}
      </div>
   );

   const renderFieldError = (key) =>
      errors[key] && <div className="field-error">{errors[key]}</div>;

   const renderLeft = () => (
      <div className="editor-col">
         <div className="editor-pair">
            <div className="field">
               <label htmlFor="title">Title</label>
               <input
                  id="title"
                  className="input"
                  value={draft.title}
                  onChange={(event) => set({ title: event.target.value })}
               />
               {renderFieldError("title")}
            </div>

            <div className="field">
               <label htmlFor="slug">Slug</label>
               <input
                  id="slug"
                  className="input editor-mono"
                  value={draft.slug}
                  placeholder={isNew ? "made from the title" : ""}
                  onChange={(event) => set({ slug: event.target.value })}
               />
               {renderFieldError("slug")}
            </div>
         </div>

         <div className="field">
            <label>Difficulty</label>
            {renderSeg(
               DIFFICULTIES.map((value) => ({ value, label: label(value) })),
               draft.difficulty,
               (value) => set({ difficulty: value }),
            )}
         </div>

         <div className="field">
            <label htmlFor="description">Description · Markdown</label>
            <textarea
               id="description"
               className="input editor-mono editor-description"
               value={draft.description}
               onChange={(event) => set({ description: event.target.value })}
            />
            {renderFieldError("description")}
         </div>

         <div>
            <div className="editor-sublabel">Preview</div>
            <div className="editor-preview problem-prose">
               {draft.description.trim() ? (
                  <Markdown>{draft.description}</Markdown>
               ) : (
                  <p className="editor-preview-empty">
                     The description shows here as users will see it.
                  </p>
               )}
            </div>
         </div>

         <div className="field">
            <label htmlFor="tags">Tags · comma separated</label>
            <input
               id="tags"
               className="input"
               value={draft.tagsText}
               placeholder="array, two-pointers"
               onChange={(event) => set({ tagsText: event.target.value })}
            />
            {renderFieldError("tags")}
         </div>

         <div className="editor-limits">
            <div className="field">
               <label htmlFor="time">Time limit · ms</label>
               <input
                  id="time"
                  className="input"
                  type="number"
                  value={draft.timeLimitMs}
                  onChange={(event) => set({ timeLimitMs: event.target.value })}
               />
               {renderFieldError("timeLimitMs")}
            </div>

            <div className="field">
               <label htmlFor="memory">Memory · MB</label>
               <input
                  id="memory"
                  className="input"
                  type="number"
                  value={draft.memoryLimitMb}
                  onChange={(event) =>
                     set({ memoryLimitMb: event.target.value })
                  }
               />
               {renderFieldError("memoryLimitMb")}
            </div>

            <div className="field">
               <label>Output comparison</label>
               {renderSeg(COMPARISONS, draft.comparisonMode, (value) =>
                  set({ comparisonMode: value }),
               )}
            </div>
         </div>
      </div>
   );

   const renderConstraints = () => (
      <div className="field">
         <label>Constraints · one per line</label>

         <div className="editor-list">
            {draft.constraints.map((line, index) => (
               <div className="editor-line" key={index}>
                  <input
                     className="input editor-mono"
                     value={line}
                     onChange={(event) =>
                        setListItem("constraints", index, event.target.value)
                     }
                  />
                  <button
                     type="button"
                     className="btn btn-icon btn-secondary"
                     onClick={() => removeListItem("constraints", index)}
                     aria-label="Remove constraint"
                  >
                     ×
                  </button>
               </div>
            ))}

            <div>
               <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                     set({ constraints: [...draft.constraints, ""] })
                  }
               >
                  + Add constraint
               </button>
            </div>
         </div>
      </div>
   );

   const renderExamples = () => (
      <div className="field">
         <label>Examples · shown to users</label>

         <div className="editor-list editor-list-wide">
            {draft.examples.map((example, index) => {
               const change = (key) => (event) =>
                  setListItem("examples", index, {
                     ...example,
                     [key]: event.target.value,
                  });

               return (
                  <div className="editor-example" key={index}>
                     <div className="editor-example-head">
                        <span>Example {index + 1}</span>
                        <button
                           type="button"
                           className="btn btn-ghost editor-small"
                           onClick={() => removeListItem("examples", index)}
                        >
                           Remove
                        </button>
                     </div>

                     <textarea
                        className="input editor-mono editor-example-box"
                        value={example.input}
                        placeholder="Input (stdin)"
                        onChange={change("input")}
                     />
                     <textarea
                        className="input editor-mono editor-example-box"
                        value={example.output}
                        placeholder="Expected output"
                        onChange={change("output")}
                     />
                     <input
                        className="input editor-example-note"
                        value={example.explanation}
                        placeholder="Explanation (optional)"
                        onChange={change("explanation")}
                     />
                  </div>
               );
            })}

            <div>
               <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                     set({
                        examples: [
                           ...draft.examples,
                           { input: "", output: "", explanation: "" },
                        ],
                     })
                  }
               >
                  + Add example
               </button>
            </div>
         </div>
      </div>
   );

   const renderRight = () => (
      <div className="editor-col">
         {renderConstraints()}
         {renderExamples()}

         <div className="field">
            <label>Supported languages</label>
            <div className="editor-langs">
               {LANGUAGES.map((language) => (
                  <button
                     key={language}
                     type="button"
                     className={
                        draft.supportedLanguages.includes(language)
                           ? "editor-chip editor-chip-on"
                           : "editor-chip"
                     }
                     onClick={() => toggleLanguage(language)}
                  >
                     {LANG_LABEL[language]}
                  </button>
               ))}
            </div>
            {renderFieldError("supportedLanguages")}
         </div>

         <div className="field">
            <label htmlFor="starter-language">Starter code</label>

            {/* The same picker the problem page has above its editor. */}
            <div className="editor-starter-bar">
               <select
                  id="starter-language"
                  className="input editor-starter-lang"
                  value={starterTab}
                  onChange={(event) => setStarterTab(event.target.value)}
                  disabled={draft.supportedLanguages.length === 1}
               >
                  {draft.supportedLanguages.map((language) => (
                     <option key={language} value={language}>
                        {LANG_LABEL[language]}
                     </option>
                  ))}
               </select>
            </div>

            <div className="editor-starter">
               <Editor
                  language={MONACO_LANG[starterTab] || "plaintext"}
                  value={draft.starterCode[starterTab] || ""}
                  options={STARTER_OPTIONS}
                  onChange={(value) =>
                     set({
                        starterCode: {
                           ...draft.starterCode,
                           [starterTab]: value ?? "",
                        },
                     })
                  }
                  loading={
                     <span className="editor-starter-loading">
                        Loading editor…
                     </span>
                  }
               />
            </div>
         </div>
      </div>
   );

   return (
      <div className="editor-grid">
         {renderLeft()}
         {renderRight()}
      </div>
   );
};

export default ProblemForm;
