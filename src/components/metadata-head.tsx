"use client";

import Head from "next/head";
import { Metadata } from "next";

interface MetadataHeadProps {
  metadata: Metadata;
}

export default function MetadataHead({ metadata }: MetadataHeadProps) {
  return (
    <Head>
      {metadata.title && <title>{metadata.title as string}</title>}
      {metadata.description && (
        <meta name="description" content={metadata.description} />
      )}

      {/* Open Graph */}
      {metadata.openGraph?.title && (
        <meta property="og:title" content={metadata.openGraph.title as string} />
      )}
      {metadata.openGraph?.description && (
        <meta property="og:description" content={metadata.openGraph.description} />
      )}
      {metadata.openGraph?.url && (
        <meta property="og:url" content={metadata.openGraph.url as string} />
      )}

      {/* Canonical */}
      {metadata.alternates?.canonical && (
        <link rel="canonical" href={metadata.alternates.canonical as string} />
      )}
    </Head>
  );
}