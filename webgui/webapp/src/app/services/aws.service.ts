// src/app/services/aws-pricing.service.ts
import { Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { API } from 'aws-amplify';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AwsService {
  private calculateMonthlyCost(intancePrice: number): number {
    const hoursPerDay = 24;
    const daysPerMonth = 30;
    const hoursPerMonth = hoursPerDay * daysPerMonth;

    // Multiply price per hour by hours in a month
    const monthlyCost = intancePrice * hoursPerMonth;
    return monthlyCost;
  }

  calculateQuotaEstimationPerMonth(
    countOfQueries: number,
    volumeSize: number,
  ): Observable<number> {
    return from(
      API.get(environment.api_endpoint_sbeacon.name, `dportal/pricing/athena`, {
        queryStringParameters: {
          volume_size: volumeSize,
        },
      }),
    ).pipe(
      map((data) => {
        const { athenaPrice, volumePrice } = data;
        const volumePricePerMonth = (volumePrice || 0) * volumeSize;

        const countToGB = 0.0000954723, // GB per Count
          gbToTB = 1 / 1024; // TB per GB

        const athenaPricePerMonth =
          countOfQueries * countToGB * gbToTB * (athenaPrice || 0);

        return parseFloat(
          (volumePricePerMonth + athenaPricePerMonth).toFixed(2),
        );
      }),
    );
  }

  calculateTotalPricePerMonth(
    instanceType: string,
    volumeSize: number,
    status: string,
  ): Observable<number> {
    return from(
      API.get(
        environment.api_endpoint_sbeacon.name,
        `dportal/pricing/instance`,
        {
          queryStringParameters: {
            instance_type: instanceType,
            volume_size: volumeSize,
          },
        },
      ),
    ).pipe(
      map((res) => {
        const { instancePrice, volumePrice } = res;
        const volumePricePerMonth = (volumePrice || 0) * volumeSize;
        const instancePricePerMonth =
          status.toLowerCase() !== 'stopped'
            ? this.calculateMonthlyCost(instancePrice || 0)
            : 0;
        return parseFloat(
          (volumePricePerMonth + instancePricePerMonth).toFixed(2),
        );
      }),
    );
  }
}
