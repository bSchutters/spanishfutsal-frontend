import * as React from "react";

interface EmailTemplateProps {
  firstName: string;
  lastName: string;
  email: string;
  topic: string;
  message: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  firstName,
  lastName,
  email,
  topic,
  message,
}) => (
  <div className="bg-amber-300 w-full h-full">
    <p>
      Nouveau message de : {firstName} {lastName}
    </p>
    <p>
      <strong>Email:</strong> {email}
    </p>
    <p>
      <strong>Sujet:</strong> {topic}
    </p>
    <p>
      <strong>Message:</strong> {message}
    </p>

    <p style={{ fontStyle: "italic", marginTop: "20px" }}>
      <strong>Merci de ne pas répondre à cet email.</strong>
    </p>
  </div>
);
