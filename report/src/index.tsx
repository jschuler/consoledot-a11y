import * as React from "react";
import { render } from "react-dom";
import "@patternfly/react-core/dist/styles/base.css";
import { A11yReport } from "@breakaway/patternfly-a11y-report";

fetch('/results.json')
  .then(res => res.json())
  .then(results => 
    render(
      <A11yReport reports={results} />,
      document.getElementById("root")
    )
  )
  .catch((error) => {
    console.error('Error:', error);
  });

