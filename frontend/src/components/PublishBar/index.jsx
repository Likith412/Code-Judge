import "./index.css";

// The draft or published state, and the button that flips it.
const PublishBar = ({ published, note, onToggle, disabled }) => (
   <div className={published ? "pub-bar pub-bar-live" : "pub-bar"}>
      <span className="pub-label">{published ? "Published" : "Draft"}</span>

      <span className="pub-body">{note}</span>

      <button
         type="button"
         className="pub-button"
         onClick={onToggle}
         disabled={disabled}
      >
         {published ? "Unpublish" : "Publish"}
      </button>
   </div>
);

export default PublishBar;
