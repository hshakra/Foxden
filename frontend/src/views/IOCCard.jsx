export function IOCCard({ ioc }) {
  // name, value, threatype, color-coded confidence, reporter, time ago, copy
  // will actually write the calculation properly just placeholder for now
  const confidenceColor = ioc.confidence;
  const currentTime = new Date().toLocaleTimeString();
  // will actually rewrite this in a way that properly calcualtes by converting the strings but just this for now
  const timeAgo = currentTime - ioc.last_seen;

  const IOCValue;
  // port, url, domain, md5 hash
  switch (ioc.ioc_type) {
    case "ip:port":
      IOCValue = ioc.ioc;
      break;
    case "domain":
      break;
    case "url":
      break;
    case "md5_hash":
      break;
    case "sha256_hash":
      break;
    default:
      break;
  }

  return (
    <div>
      <span>{ioc.malware_printable}</span>
      <span>{ioc.threat_type}</span>
    </div>
  );
}
