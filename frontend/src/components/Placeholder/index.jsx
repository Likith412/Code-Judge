const Placeholder = (props) => {
   const { title, phase, children } = props;

   return (
      <main className="cj-main">
         <h1 className="cj-page-title">{title}</h1>

         <p>{children}</p>

         <p className="cj-eyebrow">Arrives in phase {phase}</p>
      </main>
   );
};

export default Placeholder;
