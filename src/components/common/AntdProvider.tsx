import "antd/dist/reset.css";
import { ConfigProvider, theme } from "antd";
import React from "react";

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 8,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
