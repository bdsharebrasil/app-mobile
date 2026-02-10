import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CreditCard, Wallet, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeBankStatementProps {
  employeeId: string;
  employeeName: string;
}

export default function EmployeeBankStatement({
  employeeId,
  employeeName,
}: EmployeeBankStatementProps) {
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ["employee-bank", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("bank_name, bank_agency, bank_account, bank_pix")
        .eq("id", employeeId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-muted-foreground">
            Carregando informações bancárias...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar informações bancárias: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const hasBankInfo =
    employee?.bank_name ||
    employee?.bank_agency ||
    employee?.bank_account ||
    employee?.bank_pix;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Informações Bancárias
          </CardTitle>
          <CardDescription>{employeeName}</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasBankInfo ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma informação bancária cadastrada. Atualize seu perfil para adicionar dados bancários.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {employee?.bank_name && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Banco
                  </label>
                  <p className="text-base font-semibold">{employee.bank_name}</p>
                </div>
              )}

              {employee?.bank_agency && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Agência
                  </label>
                  <p className="text-base font-semibold">{employee.bank_agency}</p>
                </div>
              )}

              {employee?.bank_account && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Conta Bancária
                  </label>
                  <p className="text-base font-semibold">{employee.bank_account}</p>
                </div>
              )}

              {employee?.bank_pix && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    PIX
                  </label>
                  <p className="text-base font-semibold break-all">{employee.bank_pix}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Informação</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Essas informações são utilizadas para processamento de pagamentos e transferências.
          </p>
          <p>
            Para atualizar dados bancários, edite seu perfil na seção "Dados Pessoais".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
