'use client'

import { Breadcrumb, Spin } from "antd"
import PolicyDetail from "../../lib/PolicyDetail"
import React, { useState, useEffect } from "react"


export default function UploadPage({ params }) {
    const { uploadId } = params

    return (
        <div>
            <PolicyDetail uploadId={uploadId} />
        </div>
    )
}
