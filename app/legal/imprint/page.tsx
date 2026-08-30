import { ProsePage } from "@/components/site/prose-page";

export const metadata = { title: "Στοιχεία εταιρείας" };

export default function ImprintPage() {
  return (
    <ProsePage eyebrow="Νομικά" title="Στοιχεία εταιρείας">
      <h2>Επωνυμία</h2>
      <p><strong>AGROTIK</strong> — πλατφόρμα σύνδεσης αγροτικής αγοράς.</p>

      <h2>Έδρα</h2>
      <p>Ελλάδα</p>

      <h2>Επικοινωνία</h2>
      <ul>
        <li>Τηλέφωνο: <a href="tel:2631028971">2631028971</a></li>
        <li>Email: <a href="mailto:info@agrotik.gr">info@agrotik.gr</a></li>
      </ul>

      <h2>Υπεύθυνος περιεχομένου</h2>
      <p>Ο εκάστοτε διαχειριστής της πλατφόρμας AGROTIK.</p>

      <h2>Νομική δήλωση</h2>
      <p>
        Η AGROTIK είναι ενδιάμεσος για τη σύνδεση αγοραστών και πωλητών
        αγροτικών προϊόντων. Δεν συμμετέχει σε συναλλαγές, δεν προμηθεύει
        προϊόντα, και δεν παρέχει οικονομικές συμβουλές.
      </p>
    </ProsePage>
  );
}
