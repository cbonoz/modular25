import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { bytesToSize, getKeccak256 } from "../util";
import Image from "next/image";
import { MAX_FILE_SIZE_BYTES } from "@/constants";

const thumbsContainer = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: 16,
};

const thumb = {
  display: "inline-flex",
  borderRadius: 2,
  border: "2px dotted gray", //  #eaeaea",
  marginBottom: 8,
  marginRight: 8,
  width: 200,
  textAlign: "left",
  height: 75,
  overflow: "hidden",
  padding: 4,
  boxSizing: "border-box",
};

const thumbInner = {
  display: "flex",
  minWidth: 0,
  overflow: "hidden",
};

const img = {
  display: "block",
  width: "auto",
  height: "100%",
};

export function FileDrop({ files, setFiles }) {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      console.log("files", acceptedFiles);
      let isOk = true;
      acceptedFiles.forEach((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          // Show alert saying file must be under max
          alert(`File ${file.name} must be under ${bytesToSize(MAX_FILE_SIZE_BYTES)} for testnet`)
          isOk = false;
        }
      });
      if (!isOk) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          const bytes = event.target.result;

          const dataHash = getKeccak256(bytes);
          console.log('bytes', bytes, dataHash)
          setFiles(
            acceptedFiles.map((file) =>
              Object.assign(file, {
                preview: URL.createObjectURL(file),
                dataHash,
              })
            )
          );
      };
      reader.readAsDataURL(acceptedFiles[0]);

    
    },
    multiple: false, // https://stackoverflow.com/questions/61952768/how-to-use-dropzone-in-a-single-file-mode
  });

  const thumbs = files.map((file) => (
    <div style={thumb} key={file.name}>
      <span>
        <Image alt="File preview" src={'https://cdn-icons-png.flaticon.com/512/299/299378.png'} width={32} height={32} />&nbsp;
      </span>
      <div style={thumbInner}>
        <p>
          <b>{file.name}</b>
          <br />
          {file.size && (
            <span>
              Size: {bytesToSize(file.size)}
              <br />
            </span>
          )}
          {file.type && <span>Type: {file.type}</span>}
        </p>
      </div>
    </div>
  ));

  useEffect(
    () => () => {
      // Make sure to revoke the data uris to avoid memory leaks
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    },
    [files]
  );

  return (
    <section>
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()}/>
        <p>Drag &apos;n&apos; drop file here, or click to select a file</p>
      </div>
      <br />
      <b>{files.length === 0 ? 'Please upload one file' : 'Uploading:'}</b>
      <aside style={thumbsContainer}>{thumbs}</aside>
    </section>
  );
}