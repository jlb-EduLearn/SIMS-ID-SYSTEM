"use client";

import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RecordFormState } from "@/lib/student-form";
import {
  emergencyContactFromSource,
  inferEmergencyContactSource,
  parentNameFilled,
  type EmergencyContactSource,
} from "@/lib/emergency-contact";
import {
  parseCardUid,
  suggestCardNumberFromStudentId,
} from "@/lib/hardware/wiegand";
import { Button } from "@/components/ui/button";

type Props = {
  form: RecordFormState;
  setForm: Dispatch<SetStateAction<RecordFormState>>;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSignatureUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function RecordExtendedFields({
  form,
  setForm,
  onPhotoUpload,
  onSignatureUpload,
}: Props) {
  const isEmployee = form.recordType === "TEACHER";
  const patch = (partial: Partial<RecordFormState>) =>
    setForm({ ...form, ...partial });

  const emergencySource = useMemo(
    () => inferEmergencyContactSource(form),
    [form]
  );

  useEffect(() => {
    if (isEmployee || !form.emergencyContactRelation) return;
    const source = form.emergencyContactRelation as EmergencyContactSource;
    setForm((current) => {
      if (!parentNameFilled(current, source)) return current;
      return { ...current, ...emergencyContactFromSource(current, source) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync names when parent fields change
  }, [
    isEmployee,
    form.emergencyContactRelation,
    form.fatherFirstName,
    form.fatherMiddleName,
    form.fatherLastName,
    form.fatherSuffix,
    form.motherFirstName,
    form.motherMiddleName,
    form.motherLastName,
    form.guardianFirstName,
    form.guardianMiddleName,
    form.guardianLastName,
  ]);

  function selectEmergencySource(source: EmergencyContactSource) {
    if (!parentNameFilled(form, source)) {
      patch({
        emergencyContactRelation: source,
        emergencyContactPerson: "",
        emergencyFirstName: "",
        emergencyMiddleName: "",
        emergencyLastName: "",
      });
      return;
    }
    patch({
      ...emergencyContactFromSource(form, source),
      contactRelationship: source,
    });
  }

  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap gap-1">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="address">Address</TabsTrigger>
        {!isEmployee && <TabsTrigger value="parents">Parents</TabsTrigger>}
        {isEmployee && <TabsTrigger value="employee">Employee</TabsTrigger>}
        <TabsTrigger value="emergency">Emergency</TabsTrigger>
        <TabsTrigger value="access">Access card</TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <Field label="Picture">
              <div className="flex items-center gap-3">
                <Avatar
                  src={form.photoUrl}
                  name={`${form.firstName} ${form.lastName}`}
                  size="lg"
                />
                <Input type="file" accept="image/*" onChange={onPhotoUpload} />
              </div>
            </Field>
          </div>
          <div className="rounded-lg border p-3">
            <Field label="Signature">
              <div className="flex min-h-[80px] items-center gap-3">
                {form.signatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.signatureUrl}
                    alt="Signature"
                    className="max-h-16 max-w-[140px] object-contain"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">No signature</span>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={onSignatureUpload}
                />
              </div>
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Last Name *">
            <Input
              value={form.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
            />
          </Field>
          <Field label="First Name *">
            <Input
              value={form.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
            />
          </Field>
          <Field label="Middle Name">
            <Input
              value={form.middleName}
              onChange={(e) => patch({ middleName: e.target.value })}
            />
          </Field>
          <Field label="Suffix">
            <Input
              placeholder="Jr., III"
              value={form.suffix}
              onChange={(e) => patch({ suffix: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Birthdate">
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => patch({ dateOfBirth: e.target.value })}
            />
          </Field>
          <Field label="Birthplace">
            <Input
              value={form.birthplace}
              onChange={(e) => patch({ birthplace: e.target.value })}
            />
          </Field>
          <Field label="Gender">
            <Select
              value={form.gender || "none"}
              onValueChange={(v) => patch({ gender: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Citizenship">
            <Input
              value={form.citizenship}
              onChange={(e) => patch({ citizenship: e.target.value })}
            />
          </Field>
          <Field label="Religion">
            <Input
              value={form.religion}
              onChange={(e) => patch({ religion: e.target.value })}
            />
          </Field>
          {!isEmployee && (
            <>
              <Field label="Learner Reference Number (LRN)">
                <Input
                  value={form.learnerReferenceNumber}
                  onChange={(e) =>
                    patch({ learnerReferenceNumber: e.target.value })
                  }
                />
              </Field>
              <Field label="Student Number">
                <Input
                  value={form.studentNumber}
                  onChange={(e) => patch({ studentNumber: e.target.value })}
                />
              </Field>
              <Field label="ESC Number">
                <Input
                  value={form.escNumber}
                  onChange={(e) => patch({ escNumber: e.target.value })}
                />
              </Field>
            </>
          )}
          {isEmployee && (
            <>
              <Field label="Civil Status">
                <Input
                  value={form.civilStatus}
                  onChange={(e) => patch({ civilStatus: e.target.value })}
                />
              </Field>
              <Field label="TIN Number">
                <Input
                  value={form.tinNumber}
                  onChange={(e) => patch({ tinNumber: e.target.value })}
                />
              </Field>
              <Field label="SSS Number">
                <Input
                  value={form.sssNumber}
                  onChange={(e) => patch({ sssNumber: e.target.value })}
                />
              </Field>
              <Field label="PhilHealth Number">
                <Input
                  value={form.philhealthNumber}
                  onChange={(e) => patch({ philhealthNumber: e.target.value })}
                />
              </Field>
              <Field label="Pag-IBIG Number">
                <Input
                  value={form.pagIbigNumber}
                  onChange={(e) => patch({ pagIbigNumber: e.target.value })}
                />
              </Field>
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="address" className="mt-4 space-y-4">
        <Field label="No., Street, Subdivision">
          <Input
            value={form.addressStreet}
            onChange={(e) => patch({ addressStreet: e.target.value })}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Barangay">
            <Input
              value={form.barangay}
              onChange={(e) => patch({ barangay: e.target.value })}
            />
          </Field>
          <Field label="Municipality / City">
            <Input
              value={form.municipality}
              onChange={(e) => patch({ municipality: e.target.value })}
            />
          </Field>
          <Field label="Province">
            <Input
              value={form.province}
              onChange={(e) => patch({ province: e.target.value })}
            />
          </Field>
          <Field label="Country">
            <Input
              value={form.country}
              onChange={(e) => patch({ country: e.target.value })}
            />
          </Field>
          <Field label="Zip Code">
            <Input
              value={form.zipCode}
              onChange={(e) => patch({ zipCode: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Full address (optional — auto-filled from fields above on save)">
          <Input
            value={form.address}
            onChange={(e) => patch({ address: e.target.value })}
          />
        </Field>
      </TabsContent>

      <TabsContent value="parents" className="mt-4 space-y-4">
        <div>
          <h4 className="mb-2 text-sm font-semibold">Father</h4>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Last Name">
              <Input
                value={form.fatherLastName}
                onChange={(e) => patch({ fatherLastName: e.target.value })}
              />
            </Field>
            <Field label="First Name">
              <Input
                value={form.fatherFirstName}
                onChange={(e) => patch({ fatherFirstName: e.target.value })}
              />
            </Field>
            <Field label="Middle Name">
              <Input
                value={form.fatherMiddleName}
                onChange={(e) => patch({ fatherMiddleName: e.target.value })}
              />
            </Field>
            <Field label="Suffix">
              <Input
                value={form.fatherSuffix}
                onChange={(e) => patch({ fatherSuffix: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Mother</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Last Name">
              <Input
                value={form.motherLastName}
                onChange={(e) => patch({ motherLastName: e.target.value })}
              />
            </Field>
            <Field label="First Name">
              <Input
                value={form.motherFirstName}
                onChange={(e) => patch({ motherFirstName: e.target.value })}
              />
            </Field>
            <Field label="Middle Name">
              <Input
                value={form.motherMiddleName}
                onChange={(e) => patch({ motherMiddleName: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Guardian</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Last Name">
              <Input
                value={form.guardianLastName}
                onChange={(e) => patch({ guardianLastName: e.target.value })}
              />
            </Field>
            <Field label="First Name">
              <Input
                value={form.guardianFirstName}
                onChange={(e) => patch({ guardianFirstName: e.target.value })}
              />
            </Field>
            <Field label="Middle Name">
              <Input
                value={form.guardianMiddleName}
                onChange={(e) => patch({ guardianMiddleName: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="employee" className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Employee Number">
            <Input
              placeholder="Same as ID if left blank"
              value={form.employeeNumber}
              onChange={(e) => patch({ employeeNumber: e.target.value })}
            />
          </Field>
          <Field label="Designation *">
            <Input
              value={form.designation}
              onChange={(e) => patch({ designation: e.target.value })}
            />
          </Field>
          <Field label="Date Hired">
            <Input
              type="date"
              value={form.dateHired}
              onChange={(e) => patch({ dateHired: e.target.value })}
            />
          </Field>
          <Field label="Department">
            <Input
              value={form.department}
              onChange={(e) => patch({ department: e.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.isTeaching}
              onCheckedChange={(v) => patch({ isTeaching: v === true })}
            />
            Is teaching (Yes)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.requiresTimeInOut}
              onCheckedChange={(v) => patch({ requiresTimeInOut: v === true })}
            />
            Required time in / out
          </label>
        </div>
      </TabsContent>

      <TabsContent value="emergency" className="mt-4 space-y-4">
        {isEmployee ? (
          <>
            <Field label="Emergency Contact Person">
              <Input
                value={form.emergencyContactPerson}
                onChange={(e) =>
                  patch({ emergencyContactPerson: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="First Name">
                <Input
                  value={form.emergencyFirstName}
                  onChange={(e) =>
                    patch({ emergencyFirstName: e.target.value })
                  }
                />
              </Field>
              <Field label="Middle Name">
                <Input
                  value={form.emergencyMiddleName}
                  onChange={(e) =>
                    patch({ emergencyMiddleName: e.target.value })
                  }
                />
              </Field>
              <Field label="Last Name">
                <Input
                  value={form.emergencyLastName}
                  onChange={(e) => patch({ emergencyLastName: e.target.value })}
                />
              </Field>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Choose who to use from the{" "}
              <span className="font-medium">Parents</span> tab. Name fields fill
              in automatically.
            </p>
            <Field label="Emergency contact *">
              <Select
                value={form.emergencyContactRelation || emergencySource || "none"}
                onValueChange={(v) => {
                  if (v === "none") {
                    patch({
                      emergencyContactRelation: "",
                      contactRelationship: "",
                      emergencyContactPerson: "",
                      emergencyFirstName: "",
                      emergencyMiddleName: "",
                      emergencyLastName: "",
                    });
                    return;
                  }
                  selectEmergencySource(v as EmergencyContactSource);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mother, father, or guardian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Select —</SelectItem>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {form.emergencyContactRelation &&
              !parentNameFilled(
                form,
                form.emergencyContactRelation as EmergencyContactSource
              ) && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Add this person&apos;s name under the{" "}
                  <span className="font-medium">Parents</span> tab first.
                </p>
              )}
            {form.emergencyContactPerson && (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Contact name: </span>
                <span className="font-medium">{form.emergencyContactPerson}</span>
              </div>
            )}
          </>
        )}
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-3 text-sm font-semibold">Contact information</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Username / Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </Field>
            <Field label="Mobile Number">
              <Input
                value={form.contactPhone}
                onChange={(e) => patch({ contactPhone: e.target.value })}
              />
            </Field>
            <Field label="Landline">
              <Input
                value={form.landline}
                onChange={(e) => patch({ landline: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <Field label="Emergency Address">
          <Input
            value={form.emergencyAddress}
            onChange={(e) => patch({ emergencyAddress: e.target.value })}
          />
        </Field>
        <Field label="Emergency Contact Number">
          <Input
            value={form.emergencyPhone}
            onChange={(e) => patch({ emergencyPhone: e.target.value })}
          />
        </Field>
      </TabsContent>

      <TabsContent value="access" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          For <span className="font-medium">CDS-10</span> cards encoded with the{" "}
          <span className="font-medium">FDS-10</span> USB issuer and read by{" "}
          <span className="font-medium">RDS-20</span> /{" "}
          <span className="font-medium">ACS11-M2</span> (Wiegand 26/34).
        </p>
        <Field label="Encoder capture (FDS-10)">
          <Input
            placeholder="Click here, then tap card on USB encoder…"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const raw = (e.target as HTMLInputElement).value.trim();
                const uid = parseCardUid(raw);
                if (uid) patch({ cardUid: uid });
                else if (raw) patch({ wiegandCardNumber: raw.replace(/\D/g, "") });
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Press Enter after the reader finishes. Hex UID or decimal Wiegand
            number is stored on the fields below.
          </p>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Card UID (hex)">
            <Input
              value={form.cardUid}
              onChange={(e) =>
                patch({ cardUid: e.target.value.toUpperCase().replace(/\s/g, "") })
              }
              placeholder="04A1B2C3"
            />
          </Field>
          <Field label="Wiegand card number">
            <Input
              value={form.wiegandCardNumber}
              onChange={(e) => patch({ wiegandCardNumber: e.target.value })}
              placeholder="e.g. 12345"
            />
          </Field>
          <Field label="Wiegand facility code">
            <Input
              value={form.wiegandFacilityCode}
              onChange={(e) => patch({ wiegandFacilityCode: e.target.value })}
              placeholder="Optional (8-bit for 26-bit)"
            />
          </Field>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              wiegandCardNumber: suggestCardNumberFromStudentId(form.studentId),
            })
          }
          disabled={!form.studentId.trim()}
        >
          Suggest card number from ID
        </Button>
      </TabsContent>
    </Tabs>
  );
}
