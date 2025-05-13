import React from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkCold } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./markdown-styles.module.css";

const StyledMarkdown = ({ content }) => {
  return (
    <div className="markdown-container overflow-hidden w-full">
      <ReactMarkdown
        remarkPlugins={[[gfm, { singleTilde: false }]]}
        className={styles.reactMarkDown}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <SyntaxHighlighter
                style={coldarkCold}
                language={match[1]}
                PreTag="div"
                className="rounded-md my-2 text-xs sm:text-sm md:text-base text-blue-500"
                showLineNumbers={true}
                wrapLines={true}
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default StyledMarkdown;
